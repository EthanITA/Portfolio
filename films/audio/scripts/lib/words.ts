import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SAMPLE_RATE } from "./audio";
import { spokenForm } from "../films";

export type Word = { text: string; startMs: number; endMs: number };

export type Onset = "silence" | "aligned" | "tail" | "contested";

export type Cut = { at: number; first: string };

export type Probe = { index: number; word: string; from: number; to: number };

export type StoredWord = Word & { onset: Onset };

export type TakeWords = { takeSha: string; clipSha: string; clipMs: number; spoken: string; words: StoredWord[] };

export type WordsFile = { aligner: string; takes: Record<string, TakeWords> };

export type Heard = { word: string; start: number; end: number };

const ROOT = join(import.meta.dirname, "..", "..");

const SILENCE_BELOW_PEAK_DB = 30;
const SILENCE_MIN_MS = 20;
const SILENCE_REACH_MS = 40;
const CONTESTED_MS = 60;
const CUT_STEP_MS = 20;
const CUT_REACH_MS = 80;
const ENV_FLOOR_DB = -70;
const MIN_WORD_MS = 20;

const normal = (word: string): string => word.toLowerCase().replace(/\b50\b/, "fifty").replace(/[^a-z0-9]/g, "");

export const spokenWords = (token: string): string[] => spokenForm(` ${token} `).trim().split(/\s+/);

export const loadWords = (film: string): WordsFile | undefined => {
  try {
    return JSON.parse(readFileSync(join(ROOT, film, "sources", "words.json"), "utf8")) as WordsFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

type Timed = { start: number; end: number };

// Characters are the common currency, so a merged "CommandZ" or a split "Chin-ese" still lands on the right spoken word.
const heardChars = (heard: Heard[]): Timed[] =>
  heard.flatMap((h) => {
    const n = normal(h.word).length;
    return Array.from({ length: n }, (_, i) => ({ start: h.start + ((h.end - h.start) * i) / n, end: h.start + ((h.end - h.start) * (i + 1)) / n }));
  });

const matchChars = (ref: string, hyp: string): number[] => {
  const m = ref.length;
  const n = hyp.length;
  const cost = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      cost[i]![j] = Math.min(cost[i - 1]![j - 1]! + (ref[i - 1] === hyp[j - 1] ? 0 : 1), cost[i - 1]![j]! + 1, cost[i]![j - 1]! + 1);
    }
  }
  const at = new Array<number>(m).fill(-1);
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    const diagonal = cost[i - 1]![j - 1]! + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
    if (cost[i]![j] === diagonal) at[--i] = --j;
    else if (cost[i]![j] === cost[i - 1]![j]! + 1) i--;
    else j--;
  }
  return at;
};

export const alignWords = (written: string, heard: Heard[]): Word[] => {
  const tokens = written.split(/\s+/);
  const spoken = tokens.map(spokenWords);
  const flat = spoken.flat();
  const ref = flat.map(normal).join("");
  const hypChars = heardChars(heard);
  if (!hypChars.length) throw new Error(`nothing was heard for "${written}"`);
  const matched = matchChars(ref, heard.map((h) => normal(h.word)).join(""));

  const start = matched.map((j) => (j < 0 ? Number.NaN : hypChars[j]!.start));
  const end = matched.map((j) => (j < 0 ? Number.NaN : hypChars[j]!.end));
  for (let k = 0; k < start.length; k++) {
    if (!Number.isNaN(start[k])) continue;
    let b = k;
    while (b < start.length && Number.isNaN(start[b])) b++;
    const from = k > 0 ? end[k - 1]! : b < start.length ? start[b]! : hypChars[0]!.start;
    const to = b < start.length ? start[b]! : k > 0 ? end[k - 1]! : hypChars.at(-1)!.end;
    for (let r = 0; r < b - k; r++) {
      start[k + r] = from + ((to - from) * r) / (b - k);
      end[k + r] = from + ((to - from) * (r + 1)) / (b - k);
    }
    k = b - 1;
  }

  let cursor = 0;
  const words = spoken.map((parts, t): Word => {
    const first = cursor;
    const last = (cursor += parts.map(normal).join("").length) - 1;
    return { text: tokens[t]!, startMs: Math.round(start[first]! * 1000), endMs: Math.round(end[last]! * 1000) };
  });
  return words.map((w, i) => ({ ...w, startMs: Math.max(0, w.startMs), endMs: Math.max(w.startMs + MIN_WORD_MS, w.endMs), ...(i === 0 && { startMs: 0 }) }));
};

export const envelope = (x: Float32Array): number[] => {
  const per = SAMPLE_RATE / 1000;
  const sums = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) sums[i + 1] = sums[i]! + x[i]! * x[i]!;
  return Array.from({ length: Math.ceil(x.length / per) }, (_, ms) => {
    const a = Math.max(0, Math.round((ms - 4) * per));
    const b = Math.min(x.length, Math.round((ms + 4) * per));
    return Math.max(ENV_FLOOR_DB, 10 * Math.log10((sums[b]! - sums[a]!) / Math.max(1, b - a) + 1e-12));
  });
};

type Run = { from: number; to: number };

const silences = (env: number[]): Run[] => {
  const floor = Math.max(...env) - SILENCE_BELOW_PEAK_DB;
  const runs: Run[] = [];
  let from = -1;
  env.forEach((db, t) => {
    if (db < floor) {
      if (from < 0) from = t;
      return;
    }
    if (from >= 0 && t - from >= SILENCE_MIN_MS) runs.push({ from, to: t });
    from = -1;
  });
  return runs;
};

type Settled = { starts: number[]; onsets: Onset[] };

// Aligners start a word at its stop closure or the pause before it, so the start moves to where sound resumes.
const settle = (whisper: Word[], aligned: Word[], env: number[]): Settled => {
  const runs = silences(env);
  const starts: number[] = [];
  const onsets: Onset[] = [];
  aligned.forEach((w, i) => {
    const earliest = Math.min(w.startMs, whisper[i]!.startMs);
    const latest = Math.max(w.startMs, whisper[i]!.startMs);
    const run = i ? runs.find((r) => r.to > earliest && r.to < w.endMs && r.from <= latest + SILENCE_REACH_MS) : undefined;
    starts.push(Math.max(i ? starts[i - 1]! + MIN_WORD_MS : 0, run?.to ?? w.startMs));
    onsets.push(run ? "silence" : Math.abs(whisper[i]!.startMs - w.startMs) > CONTESTED_MS ? "contested" : "aligned");
  });
  return { starts, onsets };
};

const firstWord = (token: string): string => normal(spokenWords(token)[0]!);

export const probesFor = (whisper: Word[], aligned: Word[], env: number[]): Probe[] =>
  settle(whisper, aligned, env).onsets.flatMap((onset, i) =>
    onset === "contested"
      ? [{
          index: i,
          word: firstWord(aligned[i]!.text),
          from: Math.max(0, Math.min(aligned[i]!.startMs, whisper[i]!.startMs) - CUT_REACH_MS),
          to: Math.max(aligned[i]!.startMs, whisper[i]!.startMs),
        }]
      : [],
  );

// A word cannot start before the last cut that still hears its predecessor, so the earliest aligner start past that point wins.
const tailStart = (cuts: Cut[], word: string, candidates: number[]): number | undefined => {
  const miss = cuts.filter((cut) => cut.first !== word).at(-1);
  if (!miss) return undefined;
  const bound = miss.at + CUT_STEP_MS / 2;
  return candidates.filter((c) => c >= bound - CUT_STEP_MS).sort((a, b) => a - b)[0] ?? bound;
};

export const settleWords = (whisper: Word[], aligned: Word[], env: number[], cuts: Record<number, Cut[]> = {}): StoredWord[] => {
  const { starts, onsets } = settle(whisper, aligned, env);
  onsets.forEach((onset, i) => {
    const start = onset === "contested" && cuts[i] ? tailStart(cuts[i], firstWord(aligned[i]!.text), [aligned[i]!.startMs, whisper[i]!.startMs]) : undefined;
    if (!start) return;
    starts[i] =Math.max(starts[i - 1]! + MIN_WORD_MS, start);
    onsets[i] = "tail";
  });
  return aligned.map((w, i) => ({
    text: w.text,
    startMs: starts[i]!,
    endMs: Math.max(starts[i]! + MIN_WORD_MS, Math.min(w.endMs, starts[i + 1] ?? w.endMs)),
    onset: onsets[i]!,
  }));
};

export const anchorOf = (words: Word[], anchor: string): Word => {
  const hit = words.find((w) => normal(w.text) === normal(anchor) || spokenWords(w.text).map(normal)[0] === normal(anchor));
  if (!hit) throw new Error(`anchor word "${anchor}" is not in "${words.map((w) => w.text).join(" ")}"`);
  return hit;
};
