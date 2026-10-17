import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { bare, NARRATOR, type Spoken } from "../scripts/cues.ts";
import { GRID, WINDOW, type Cut } from "../scripts/script.ts";

export const SKY = {
  enter: MOTION_DURATION.snappy,
  rise: 0.4,
  blur: 6,
  ripple: 15,
  settle: MOTION_DURATION.moderate,
  swell: 1.08,
  exit: MOTION_DURATION.fast,
  trail: 20,
  tie: 0.1,
} as const;

export const STEPS = {
  wide: [
    { size: "8xl", rows: [1] },
    { size: "6xl", rows: [2] },
  ],
  tall: [
    { size: "7xl", rows: [1] },
    { size: "5xl", rows: [2, 3] },
  ],
} as const;

export type Size = (typeof STEPS)[Cut][number]["size"];

export type Widths = { words: number[]; space: number };

export type Tone = "ink" | "violet" | "muted";

export type Letter = { text: string; at: number };

export type Word = { text: string; at: number; leave: number; x: number; tone: Tone; code: boolean; swell: boolean; letters?: Letter[] };

export type Row = { width: number; words: Word[] };

export type Line = { text: string; size: Size; at: number; leave: number; rows: Row[] };

export type Pose = { opacity: number; y: number; blur: number; scale: number };

export type PlanOptions = { lines: Spoken[]; measured: Partial<Record<Size, Widths>>[]; cut: Cut; fold: number; violet: string[] };

const CODE = new Set(["?", "⌘Z"]);

const letters = (text: string): string[] => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)].map(({ segment }) => segment);

const sentence = (word: string): boolean => /[.?!]$/u.test(word);

const splits = (count: number, rows: number): number[][] =>
  rows <= 1 ? [[]] : Array.from({ length: count - rows + 1 }, (_, index) => index + 1).flatMap((first) => splits(count - first, rows - 1).map((rest) => [first, ...rest.map((at) => at + first)]));

type Option = { breaks: number[]; widths: number[]; widest: number; sentences: number };

const balance = ({ words, widths, space, rows, measure }: { words: string[]; widths: number[]; space: number; rows: number; measure: number }): Option | undefined => {
  const fits = splits(words.length, rows)
    .map((breaks): Option => {
      const edges = [0, ...breaks, words.length];
      const rowWidths = breaks.concat(words.length).map((end, index) => {
        const part = widths.slice(edges[index] ?? 0, end);
        return part.reduce((sum, width) => sum + width, 0) + space * (part.length - 1);
      });
      return { breaks, widths: rowWidths, widest: Math.max(...rowWidths), sentences: breaks.filter((at) => sentence(words[at - 1] ?? "")).length };
    })
    .filter((option) => option.widest <= measure);
  if (!fits.length) return undefined;
  const best = Math.min(...fits.map((option) => option.widest));
  const tied = fits.filter((option) => option.widest <= best * (1 + SKY.tie));
  const most = Math.max(...tied.map((option) => option.sentences));
  return tied.filter((option) => option.sentences === most).reduce((pick, option) => (option.widest < pick.widest ? option : pick));
};

const layout = ({ words, measured, cut }: { words: string[]; measured: Partial<Record<Size, Widths>>; cut: Cut }): { size: Size; widths: Widths; option: Option } | undefined => {
  for (const step of STEPS[cut]) {
    const widths = measured[step.size];
    if (!widths) continue;
    for (const rows of step.rows) {
      const option = balance({ words, widths: widths.words, space: widths.space, rows: Math.min(rows, words.length), measure: WINDOW[cut].width });
      if (option) return { size: step.size, widths, option };
    }
  }
  return undefined;
};

const beatAfter = (ms: number): number => GRID.originMs + Math.ceil((ms - GRID.originMs) / GRID.beatMs) * GRID.beatMs;

const span = (count: number): number => SKY.exit + SKY.trail * (count - 1);

const arrives = (word: Word): number => (word.letters ? (word.letters.at(-1)?.at ?? word.at) + Math.max(SKY.enter, SKY.settle) : word.at + (word.swell ? Math.max(SKY.enter, SKY.settle) : SKY.enter));

const place = ({ spoken, measured, cut, marked, centred }: { spoken: Spoken; measured: Partial<Record<Size, Widths>>; cut: Cut; marked: Set<string>; centred: boolean }): Line | undefined => {
  const texts = spoken.words.map((word) => word.text);
  const fit = layout({ words: texts, measured, cut });
  if (!fit) return undefined;
  const { anchor } = spoken;
  const anchored = anchor ? texts.findIndex((text) => bare(text) === bare(anchor.word)) : -1;
  const edges = [0, ...fit.option.breaks, texts.length];
  const rows = fit.option.widths.map((width, row): Row => {
    const start = edges[row] ?? 0;
    let x = centred ? (WINDOW[cut].width - width) / 2 : 0;
    const words = spoken.words.slice(start, edges[row + 1]).map((word, offset): Word => {
      const index = start + offset;
      const code = CODE.has(word.text);
      const swell = index === anchored;
      const at = swell && anchor ? anchor.beatMs : word.startMs;
      const tone: Tone = spoken.voice !== NARRATOR ? "muted" : marked.has(bare(word.text)) ? "violet" : "ink";
      const placed: Word = { text: word.text, at, leave: Number.POSITIVE_INFINITY, x, tone, code, swell, ...(swell && !code ? { letters: letters(word.text).map((text, n) => ({ text, at: at + n * SKY.ripple })) } : {}) };
      x += (fit.widths.words[index] ?? 0) + fit.widths.space;
      return placed;
    });
    return { width, words };
  });
  return { text: spoken.text, size: fit.size, at: rows[0]?.words[0]?.at ?? spoken.onsetMs, leave: Number.POSITIVE_INFINITY, rows };
};

const plan = ({ lines, measured, cut, fold, violet }: PlanOptions): { lines: Line[]; problems: string[] } => {
  const problems: string[] = [];
  const marked = new Set(violet.map(bare));
  const placed = lines.flatMap((spoken, index): Line[] => {
    const line = place({ spoken, measured: measured[index] ?? {}, cut, marked, centred: index === lines.length - 1 });
    if (!line) problems.push(`line "${spoken.text}" fits no ${cut} size inside ${WINDOW[cut].width} px`);
    return line ? [line] : [];
  });
  const timed = placed.map((line, index): Line => {
    const next = placed[index + 1];
    const words = line.rows.flatMap((row) => row.words);
    const last = words.at(-1)?.at ?? line.at;
    // A line still being spoken at the fold stays a beat past its last word, so no word leaves the frame it lands.
    const leave = !next ? Number.POSITIVE_INFINITY : next.at >= fold ? Math.max(fold, beatAfter(last + GRID.beatMs)) : next.at - span(words.length);
    let order = 0;
    const rows = line.rows.map((row) => ({ ...row, words: row.words.map((word) => ({ ...word, leave: leave + SKY.trail * order++ })) }));
    return { ...line, leave, rows };
  });
  timed.forEach((line, index) => {
    const words = line.rows.flatMap((row) => row.words);
    for (const word of words) {
      if (word.leave < arrives(word)) problems.push(`"${word.text}" in "${line.text}" leaves at ${word.leave} ms, before it is in at ${arrives(word)}`);
    }
    const next = timed[index + 1];
    const gone = line.leave + span(words.length);
    if (next && next.at < gone) problems.push(`"${next.text}" lands at ${next.at} ms while "${line.text}" is leaving until ${gone}`);
  });
  return { lines: timed, problems };
};

const progress = ({ ms, from, length }: { ms: number; from: number; length: number }): number => Math.min(1, Math.max(0, (ms - from) / length));

const pose = ({ ms, at, leave, swell }: { ms: number; at: number; leave: number; swell: boolean }): Pose => {
  if (ms >= leave) {
    const out = MOTION_EASE.out(progress({ ms, from: leave, length: SKY.exit }));
    return { opacity: 1 - out, y: -SKY.rise * out, blur: 0, scale: 1 };
  }
  const enter = MOTION_EASE.out(progress({ ms, from: at, length: SKY.enter }));
  const settle = swell ? MOTION_EASE.out(progress({ ms, from: at, length: SKY.settle })) : 1;
  return { opacity: enter, y: SKY.rise * (1 - enter), blur: SKY.blur * (1 - enter), scale: 1 + (SKY.swell - 1) * (1 - settle) };
};

export const Sky = { plan, pose, letters };
