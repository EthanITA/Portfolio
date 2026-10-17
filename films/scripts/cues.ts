import sage from "../audio/sage/cues.json" with { type: "json" };
import shell from "../audio/shell/cues.json" with { type: "json" };
import sidecar from "../audio/sidecar/cues.json" with { type: "json" };
import { GRID, onBeat, type FilmScript } from "./script.ts";

export type Word = { text: string; startMs: number; endMs: number };

export type Spoken = { text: string; voice: string; onsetMs: number; endMs: number; words: Word[]; anchor?: { word: string; beatMs: number } };

export type Accent = { atMs: number; kind: string };

export type Sheet = { closeMs: number; accents: Accent[]; lines: Spoken[] };

export const SHEETS = { sage, shell, sidecar };

export const NARRATOR = "narrator";
const FRAME = 1000 / 60;
const LEAD = 30;
const CLOSE = 20;

type Data = Record<string, unknown>;

const record = (value: unknown): Data | undefined => (value && typeof value === "object" && !Array.isArray(value) ? (value as Data) : undefined);

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const number = (data: Data | undefined, key: string): number | undefined => {
  const value = data?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const text = (data: Data | undefined, key: string): string | undefined => {
  const value = data?.[key];
  return typeof value === "string" ? value : undefined;
};

const word = (value: unknown): Word | undefined => {
  const data = record(value);
  const startMs = number(data, "startMs");
  const endMs = number(data, "endMs");
  const shown = text(data, "text");
  return typeof shown === "string" && typeof startMs === "number" && typeof endMs === "number" ? { text: shown, startMs, endMs } : undefined;
};

// Anchors name the spoken word, while the words carry the line's punctuation, so the two meet without it.
export const bare = (value: string): string => value.replace(/\p{P}/gu, "").toLowerCase();

const spoken = ({ cue, script, problems }: { cue: Data | undefined; script: FilmScript; problems: string[] }): Spoken | undefined => {
  const line = text(cue, "text") ?? "";
  const voice = text(cue, "voice") ?? "";
  const onsetMs = number(cue, "onsetMs");
  const endMs = number(cue, "endMs");
  const words = list(cue?.words).map(word);
  const where = `line "${line}"`;
  if (typeof onsetMs !== "number" || typeof endMs !== "number") {
    problems.push(`${where} has no onsetMs and endMs for its take`);
    return undefined;
  }
  if (!words.length) problems.push(`${where} has no words`);
  if (words.some((item) => !item)) {
    problems.push(`${where} has a word without text, startMs and endMs`);
    return undefined;
  }
  const timed = words.filter((item): item is Word => Boolean(item));
  const read = timed.map((item) => item.text).join(" ");
  if (timed.length && read !== line) problems.push(`${where} has words reading "${read}", which should be the line as written`);
  if (onsetMs < 0 || endMs > script.duration) problems.push(`${where} runs ${onsetMs} to ${endMs} ms, outside the film's 0 to ${script.duration}`);
  timed.forEach((item, index) => {
    const previous = timed[index - 1];
    if (item.endMs < item.startMs) problems.push(`${where} has "${item.text}" ending at ${item.endMs} before it starts at ${item.startMs}`);
    if (previous && item.startMs < previous.startMs) problems.push(`${where} has "${item.text}" at ${item.startMs} ms, before "${previous.text}" at ${previous.startMs}`);
    if (item.startMs < onsetMs - FRAME || item.endMs > endMs + FRAME) problems.push(`${where} has "${item.text}" at ${item.startMs} to ${item.endMs} ms, outside its take ${onsetMs} to ${endMs}`);
  });
  const anchorData = record(cue?.anchor);
  const anchorWord = text(anchorData, "word");
  const beatMs = number(anchorData, "beatMs");
  if (!anchorData) return { text: line, voice, onsetMs, endMs, words: timed };
  if (typeof anchorWord !== "string" || typeof beatMs !== "number") {
    problems.push(`${where} has an anchor without word and beatMs`);
    return { text: line, voice, onsetMs, endMs, words: timed };
  }
  const landing = timed.find((item) => bare(item.text) === bare(anchorWord));
  if (!onBeat(beatMs)) problems.push(`${where} anchors "${anchorWord}" at ${beatMs} ms, off the ${GRID.beatMs} ms beat`);
  if (!landing) problems.push(`${where} anchors "${anchorWord}", which is not one of its words`);
  else if (landing.startMs > beatMs || landing.startMs < beatMs - LEAD) problems.push(`${where} starts "${anchorWord}" at ${landing.startMs} ms, not within ${LEAD} ms before its beat at ${beatMs}`);
  return { text: line, voice, onsetMs, endMs, words: timed, anchor: { word: anchorWord, beatMs } };
};

export const mixProblems = ({ json, mixSha256 }: { json: unknown; mixSha256: string }): string[] => {
  const measured = text(record(json), "mixSha256");
  return measured === mixSha256 ? [] : [`mixSha256 is ${String(measured)}, while the mix.wav beside it hashes to ${mixSha256}`];
};

export const readSheet = ({ script, json }: { script: FilmScript; json: unknown }): { sheet: Sheet; problems: string[] } => {
  const problems: string[] = [];
  const root = record(json);
  const bed = record(root?.bed);
  const grid = record(bed?.grid);
  for (const key of ["bpm", "beatMs", "barMs", "originMs"] as const) {
    if (number(grid, key) !== GRID[key]) problems.push(`bed.grid.${key} is ${String(grid?.[key])}, the film's grid has ${GRID[key]}`);
  }
  const durationMs = number(root, "durationMs");
  if (durationMs !== script.duration) problems.push(`durationMs is ${String(durationMs)}, the film runs ${script.duration} ms`);
  const closeMs = number(bed, "closeMs") ?? 0;
  if (Math.abs(closeMs - script.close) > CLOSE) problems.push(`bed.closeMs is ${closeMs}, more than ${CLOSE} ms from the film's close at ${script.close}`);

  const accents = list(bed?.accents).flatMap((value): Accent[] => {
    const data = record(value);
    const atMs = number(data, "atMs");
    const kind = text(data, "kind");
    if (typeof atMs !== "number" || typeof kind !== "string") {
      problems.push("bed.accents has an entry without atMs and kind");
      return [];
    }
    if (atMs < 0 || atMs > script.duration) problems.push(`accent "${kind}" at ${atMs} ms is outside the film`);
    return [{ atMs, kind }];
  });
  const close = accents.find((accent) => accent.kind === "close");
  if (!close || Math.abs(close.atMs - closeMs) > CLOSE) problems.push(`bed.accents has no "close" accent at bed.closeMs ${closeMs}`);

  const voices = list(root?.cues)
    .map(record)
    .filter((cue) => cue?.stem === "voice");
  for (const cue of voices) {
    if (text(cue, "voice") === NARRATOR && !script.lines.includes(text(cue, "text") ?? "")) problems.push(`narrator cue "${String(cue?.text)}" is none of the film's lines`);
  }
  const lines = script.lines.flatMap((line): Spoken[] => {
    const matches = voices.filter((cue) => text(cue, "text") === line);
    if (matches.length !== 1) {
      problems.push(`line "${line}" has ${matches.length} voice cues, it needs exactly one`);
      return [];
    }
    const read = spoken({ cue: matches[0], script, problems });
    return read ? [read] : [];
  });
  lines.forEach((line, index) => {
    const next = lines[index + 1];
    if (next && next.onsetMs < line.endMs) problems.push(`line "${next.text}" starts at ${next.onsetMs} ms, before "${line.text}" ends at ${line.endMs}`);
  });

  return { sheet: { closeMs, accents, lines }, problems };
};
