import type { FilmName } from "../films";
import { SHEETS } from "../sheets";
import { SAMPLE_RATE, type Stereo } from "./audio";
import { type GrooveStyle, type Layer, type Section, renderGroove, scheduleLayer } from "./groove";

const row = (hits: Record<number, number>): number[] => Array.from({ length: 16 }, (_, step) => hits[step] ?? 0);

const EIGHTHS = row({ 0: 1, 2: 0.7, 4: 1, 6: 0.7, 8: 1, 10: 0.7, 12: 1, 14: 0.7 });
const SIXTEENTHS = row({ 0: 1, 1: 0.4, 2: 0.7, 3: 0.4, 4: 1, 5: 0.4, 6: 0.7, 7: 0.4, 8: 1, 9: 0.4, 10: 0.7, 11: 0.4, 12: 1, 13: 0.4, 14: 0.7, 15: 0.4 });

const BPM = 120;
const BEATS_PER_BAR = 4;
const DRIVE: Layer[] = ["kick", "hat", "bass"];
const FULL: Layer[] = ["kick", "hat", "bass", "clap", "pluck"];
const BREAKDOWN_LAYERS: Layer[] = ["kick", "bass"];
const ISLAND_OPEN_BEAT = 4;

const SHARED = {
  bpm: BPM,
  swing: 0.08,
  progression: [
    [62, 66, 69, 76],
    [59, 62, 66, 69],
    [55, 59, 62, 69],
    [57, 62, 64, 69],
  ],
  levelsDb: { kick: -10, bass: -12, stab: -16, clap: -16, pluck: -18, hat: -20 },
  pumpDepth: 0.3,
  wet: 0.15,
};

const PATTERNS: GrooveStyle["patterns"] = {
  kick: row({ 0: 1, 4: 1, 8: 1, 12: 1 }),
  clap: row({ 4: 1, 12: 1 }),
  hat: EIGHTHS,
  bass: row({ 0: 1, 6: 0.9, 10: 0.8 }),
  pluck: row({ 3: 0.8, 7: 0.6, 11: 0.8, 14: 0.6 }),
};

const PATTERN_OVERRIDES: Record<FilmName, Partial<GrooveStyle["patterns"]>> = {
  shell: { hat: SIXTEENTHS },
  sage: { pluck: row({ 0: 0.9, 2: 0.5, 4: 0.7, 6: 0.5, 8: 0.9, 10: 0.5, 12: 0.7, 14: 0.5 }) },
  sidecar: {},
};

const SEEDS: Record<FilmName, number> = { sidecar: 1108, sage: 1208, shell: 1308 };

const beatMs = (60_000 / BPM);

const beatOf = (ms: number): number => {
  const beat = ms / beatMs;
  if (!Number.isInteger(beat)) throw new Error(`${ms} ms is off the ${beatMs} ms beat`);
  return beat;
};

const styleOf = (name: FilmName): GrooveStyle => {
  const { closeMs, breakdown, stabsMs } = SHEETS[name];
  const sections: Section[] = [
    { beat: 0, layers: DRIVE },
    { beat: ISLAND_OPEN_BEAT, layers: FULL },
    { beat: beatOf(breakdown[0]), layers: BREAKDOWN_LAYERS },
    { beat: beatOf(breakdown[1]), layers: FULL },
  ];
  const stabs = stabsMs.map((ms) => beatOf(ms) * beatMs);
  return { ...SHARED, patterns: { ...PATTERNS, ...PATTERN_OVERRIDES[name] }, closeBeat: beatOf(closeMs), stabsMs: stabs, sections };
};

export const synthBed = (name: FilmName, durationMs: number): Stereo => renderGroove(styleOf(name), durationMs, SEEDS[name]);

export type BedPlan = {
  grid: { bpm: number; beatMs: number; barMs: number; originMs: number; beats: number };
  closeMs: number;
  breakdown: { fromMs: number; toMs: number };
  sections: Array<{ bar: number; beat: number; atMs: number; layers: Layer[] }>;
  accents: Array<{ atMs: number; kind: "clap" | "stab" | "close" }>;
};

export const bedPlan = (name: FilmName, durationMs: number): BedPlan => {
  const style = styleOf(name);
  const { closeMs, breakdown } = SHEETS[name];
  const claps = scheduleLayer(style, "clap").map((hit) => ({ atMs: Math.round((hit.at / SAMPLE_RATE) * 1000), kind: "clap" as const }));
  const accents = [...claps, ...style.stabsMs.map((atMs) => ({ atMs, kind: "stab" as const })), { atMs: closeMs, kind: "close" as const }].sort((a, b) => a.atMs - b.atMs);
  return {
    grid: { bpm: BPM, beatMs, barMs: beatMs * BEATS_PER_BAR, originMs: 0, beats: Math.floor(durationMs / beatMs) },
    closeMs,
    breakdown: { fromMs: breakdown[0], toMs: breakdown[1] },
    sections: style.sections.map((s) => ({ bar: Math.floor(s.beat / BEATS_PER_BAR), beat: s.beat, atMs: s.beat * beatMs, layers: s.layers })),
    accents,
  };
};
