import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { bare, NARRATOR, type Spoken } from "../scripts/cues.ts";
import { GRID, SAFE_MARGIN, WINDOW, type Cut, type Key, type Wait } from "../scripts/script.ts";

export const SKY = {
  enter: MOTION_DURATION.snappy,
  rise: 0.4,
  blur: 6,
  ripple: 15,
  settle: MOTION_DURATION.moderate,
  swell: 1.08,
  exit: MOTION_DURATION.fast,
  trail: 20,
  gap: 8,
  pad: 0.25,
  pulse: { scale: 1.06, over: 250 },
  dip: { scale: 0.96, over: MOTION_DURATION.press },
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

export type Word = { text: string; index: number; at: number; leave: number; x: number; width: number; tone: Tone; code: boolean; swell: boolean; letters?: Letter[] };

export type Row = { width: number; words: Word[] };

export type Line = { text: string; size: Size; at: number; leave: number; rows: Row[] };

export type Pose = { opacity: number; y: number; blur: number; scale: number };

export type PlanOptions = { lines: Spoken[]; measured: Partial<Record<Size, Widths>>[]; cut: Cut; fold: number; violet: string[] };

export type Metrics = { em: number; descent: number };

export type Box = { width: number; height: number };

export type Cap = { keys: string; at: number; leave: number; dips: number[]; pulses: number[]; bottom: number };

export type CapOptions = { keys: readonly Key[]; waits: Wait[]; lines: Line[]; metrics: Partial<Record<Size, Metrics>>; boxes: Partial<Record<string, Box>>; cut: Cut };

const CODE = new Set(["?", "⌘Z"]);

const letters = (text: string): string[] => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)].map(({ segment }) => segment);

// A "?" chip is a code token, so it never ends a sentence.
const sentence = (word: string): boolean => !CODE.has(word) && /[.?!]$/u.test(word);

const splits = (count: number, rows: number): number[][] =>
  rows <= 1 ? [[]] : Array.from({ length: count - rows + 1 }, (_, index) => index + 1).flatMap((first) => splits(count - first, rows - 1).map((rest) => [first, ...rest.map((at) => at + first)]));

type Option = { breaks: number[]; widths: number[]; widest: number; sentences: number };

const options = ({ words, widths, space, rows, measure }: { words: string[]; widths: number[]; space: number; rows: number; measure: number }): Option[] =>
  splits(words.length, rows)
    .map((breaks): Option => {
      const edges = [0, ...breaks, words.length];
      const rowWidths = breaks.concat(words.length).map((end, index) => {
        const part = widths.slice(edges[index] ?? 0, end);
        return part.reduce((sum, width) => sum + width, 0) + space * (part.length - 1);
      });
      return { breaks, widths: rowWidths, widest: Math.max(...rowWidths), sentences: breaks.filter((at) => sentence(words[at - 1] ?? "")).length };
    })
    .filter((option) => option.widest <= measure);

const better = (pick: Option, option: Option): Option => {
  if (option.sentences !== pick.sentences) return option.sentences > pick.sentences ? option : pick;
  if (option.widths.length !== pick.widths.length) return option.widths.length < pick.widths.length ? option : pick;
  return option.widest < pick.widest ? option : pick;
};

const layout = ({ words, measured, cut }: { words: string[]; measured: Partial<Record<Size, Widths>>; cut: Cut }): { size: Size; widths: Widths; option: Option } | undefined => {
  for (const step of STEPS[cut]) {
    const widths = measured[step.size];
    if (!widths) continue;
    const fits = step.rows.flatMap((rows) => options({ words, widths: widths.words, space: widths.space, rows: Math.min(rows, words.length), measure: WINDOW[cut].width }));
    const [first, ...rest] = fits;
    if (first) return { size: step.size, widths, option: rest.reduce(better, first) };
  }
  return undefined;
};

const beatAfter = (ms: number): number => GRID.originMs + Math.ceil((ms - GRID.originMs) / GRID.beatMs) * GRID.beatMs;

const span = (count: number): number => SKY.exit + SKY.trail * (count - 1);

const gone = (line: Line): number => line.leave + span(line.rows.reduce((count, row) => count + row.words.length, 0));

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
      const width = fit.widths.words[index] ?? 0;
      const code = CODE.has(word.text);
      const swell = index === anchored;
      const at = swell && anchor ? anchor.beatMs : word.startMs;
      const tone: Tone = spoken.voice !== NARRATOR ? "muted" : marked.has(bare(word.text)) ? "violet" : "ink";
      const placed: Word = { text: word.text, index, at, leave: Number.POSITIVE_INFINITY, x, width, tone, code, swell, ...(swell && !code ? { letters: letters(word.text).map((text, n) => ({ text, at: at + n * SKY.ripple })) } : {}) };
      x += width + fit.widths.space;
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
    if (next && next.at < gone(line)) problems.push(`"${next.text}" lands at ${next.at} ms while "${line.text}" is leaving until ${gone(line)}`);
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

const code = (text: string): boolean => CODE.has(text);

type Hold = { keys: string; at: number; until: number; dips: number[]; pulses: number[] };

const beats = ({ after, before }: { after: number; before: number }): number[] => {
  const first = beatAfter(after + 1);
  return Array.from({ length: Math.max(0, Math.ceil((before - first) / GRID.beatMs)) }, (_, index) => first + index * GRID.beatMs);
};

// Presses of one key that touch merge into one cap, so ⌘Z twice and Return after its wait dip instead of blinking.
const holds = ({ keys, waits }: { keys: readonly Key[]; waits: Wait[] }): Hold[] =>
  [
    ...keys.map((key): Hold => ({ keys: key.key, at: key.at, until: key.until ?? key.at + GRID.beatMs, dips: [key.at], pulses: [] })),
    ...waits.map((wait): Hold => ({ keys: wait.key, at: wait.at, until: wait.until, dips: [], pulses: beats({ after: wait.at, before: wait.until }) })),
  ]
    .sort((a, b) => a.at - b.at)
    .reduce<Hold[]>((merged, hold) => {
      const last = merged.at(-1);
      if (!last || last.keys !== hold.keys || hold.at > last.until) return [...merged, hold];
      return [...merged.slice(0, -1), { ...last, until: Math.max(last.until, hold.until), dips: [...last.dips, ...hold.dips], pulses: [...last.pulses, ...hold.pulses] }];
    }, []);

const height = ({ line, em }: { line: Line; em: number }): number => line.rows.length * em + (line.rows.length - 1) * SKY.gap + SKY.pad * em;

const right = (line: Line): number => {
  const last = line.rows.at(-1)?.words.at(-1);
  return last ? last.x + last.width : 0;
};

const caps = ({ keys, waits, lines, metrics, boxes, cut }: CapOptions): { caps: Cap[]; problems: string[] } => {
  const problems: string[] = [];
  const merged = holds({ keys, waits });
  const placed = merged.flatMap((hold, index): Cap[] => {
    const next = merged[index + 1];
    const leave = next && next.at < hold.until + SKY.exit ? next.at - SKY.exit : hold.until;
    if (leave < hold.at + SKY.enter) problems.push(`keycap "${hold.keys}" at ${hold.at} ms leaves at ${leave}, before it is in at ${hold.at + SKY.enter}`);
    const box = boxes[hold.keys];
    if (!box) {
      problems.push(`keycap "${hold.keys}" was not measured`);
      return [];
    }
    const shown = lines.filter((line) => line.at < leave + SKY.exit && gone(line) > hold.at);
    const fallback = STEPS[cut][0].size;
    const em = (line?: Line): number => metrics[line?.size ?? fallback]?.em ?? 0;
    const beside = shown.every((line) => right(line) + SKY.gap + box.width <= WINDOW[cut].width);
    const bottom = beside ? SKY.pad * em(shown[0]) + (metrics[shown[0]?.size ?? fallback]?.descent ?? 0) : Math.max(...shown.map((line) => height({ line, em: em(line) }))) + SKY.gap;
    if (bottom + box.height > WINDOW[cut].y - SAFE_MARGIN) problems.push(`keycap "${hold.keys}" at ${hold.at} ms needs ${Math.ceil(bottom + box.height)} px above the line, the ${cut} sky has ${WINDOW[cut].y - SAFE_MARGIN}`);
    return [{ keys: hold.keys, at: hold.at, leave, bottom, dips: hold.dips.filter((at) => at > hold.at && at + SKY.dip.over <= leave), pulses: hold.pulses.filter((at) => at + SKY.pulse.over <= leave) }];
  });
  return { caps: placed, problems };
};

const bump = ({ ms, at, over }: { ms: number; at: number; over: number }): number => {
  const progress = (ms - at) / over;
  return progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
};

const press = ({ ms, cap }: { ms: number; cap: Cap }): Pose => {
  const base = pose({ ms, at: cap.at, leave: cap.leave, swell: false });
  const pulse = Math.max(0, ...cap.pulses.map((at) => bump({ ms, at, over: SKY.pulse.over })));
  const dip = Math.max(0, ...cap.dips.map((at) => bump({ ms, at, over: SKY.dip.over })));
  return { ...base, scale: base.scale * (1 + (SKY.pulse.scale - 1) * pulse) * (1 - (1 - SKY.dip.scale) * dip) };
};

export const Sky = { plan, pose, letters, code, caps, press };
