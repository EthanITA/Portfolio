import type { FilmName } from "../films";
import type { Stereo } from "./audio";
import { type GrooveStyle, type Layer, type Section, renderGroove } from "./groove";

const row = (hits: Record<number, number>): number[] => Array.from({ length: 16 }, (_, step) => hits[step] ?? 0);

const EIGHTHS = row({ 0: 1, 2: 0.7, 4: 1, 6: 0.7, 8: 1, 10: 0.7, 12: 1, 14: 0.7 });
const SIXTEENTHS = row({ 0: 1, 1: 0.4, 2: 0.7, 3: 0.4, 4: 1, 5: 0.4, 6: 0.7, 7: 0.4, 8: 1, 9: 0.4, 10: 0.7, 11: 0.4, 12: 1, 13: 0.4, 14: 0.7, 15: 0.4 });

const SHARED = {
  bpm: 108,
  swing: 0.08,
  progression: [
    [62, 66, 69, 76],
    [59, 62, 66, 69],
    [55, 59, 62, 69],
    [57, 62, 64, 69],
  ],
  levelsDb: { kick: -10, bass: -12, stab: -16, clap: -16, pluck: -18, hat: -20 },
  wet: 0.15,
};

const PATTERNS: GrooveStyle["patterns"] = {
  kick: row({ 0: 1, 6: 0.8, 8: 0.9 }),
  clap: row({ 4: 1, 12: 1 }),
  hat: EIGHTHS,
  bass: row({ 0: 1, 6: 0.9, 10: 0.8 }),
  pluck: row({ 3: 0.8, 7: 0.6, 11: 0.8, 14: 0.6 }),
  stab: row({ 6: 0.9, 14: 0.8 }),
};

const layers = (...names: Layer[]): Layer[] => names;
const GROOVE = layers("kick", "hat", "bass");
const EVERYTHING = layers("kick", "hat", "bass", "pluck", "clap", "stab");
const COUNT_IN: Section = { bar: -1, layers: layers("hat") };

const STYLES: Record<FilmName, GrooveStyle> = {
  shell: {
    ...SHARED,
    downbeatMs: 3200,
    closeBar: 13,
    pumpDepth: 0.2,
    patterns: { ...PATTERNS, kick: row({ 0: 1, 6: 0.8, 8: 0.9, 14: 0.7 }), hat: SIXTEENTHS },
    sections: [
      COUNT_IN,
      { bar: 0, layers: layers("kick", "hat") },
      { bar: 2, layers: GROOVE },
      { bar: 5, layers: layers(...GROOVE, "pluck") },
      { bar: 7, layers: layers(...GROOVE, "pluck", "clap") },
      { bar: 9, layers: EVERYTHING, once: layers("stab") },
      { bar: 11, layers: EVERYTHING },
    ],
  },
  sage: {
    ...SHARED,
    downbeatMs: 3000,
    closeBar: 15,
    pumpDepth: 0.3,
    patterns: { ...PATTERNS, kick: row({ 0: 1, 6: 0.8, 8: 0.9 }) },
    sections: [
      COUNT_IN,
      { bar: 0, layers: layers("kick", "hat") },
      { bar: 3, layers: GROOVE },
      { bar: 4, layers: layers(...GROOVE, "pluck"), patterns: { pluck: row({ 0: 0.9, 2: 0.5, 4: 0.7, 6: 0.5, 8: 0.9, 10: 0.5, 12: 0.7, 14: 0.5 }) } },
      { bar: 9, layers: layers(...GROOVE, "pluck", "stab") },
      { bar: 11, layers: EVERYTHING },
      { bar: 12, layers: layers(...GROOVE, "pluck") },
      { bar: 14, layers: GROOVE },
    ],
  },
  sidecar: {
    ...SHARED,
    downbeatMs: 3000,
    closeBar: 17,
    pumpDepth: 0.3,
    patterns: { ...PATTERNS, kick: row({ 0: 1, 4: 0.8, 8: 1, 12: 0.8 }) },
    sections: [
      COUNT_IN,
      { bar: 0, layers: layers("kick", "hat") },
      { bar: 2, layers: GROOVE },
      { bar: 3, layers: layers(...GROOVE, "pluck") },
      { bar: 7, layers: layers(...GROOVE, "pluck", "clap") },
      { bar: 9, layers: layers(...GROOVE, "pluck", "clap", "stab") },
      { bar: 11, layers: EVERYTHING },
      { bar: 14, layers: GROOVE },
    ],
  },
};

const SEEDS: Record<FilmName, number> = { sidecar: 1108, sage: 1208, shell: 1308 };

export const synthBed = (name: FilmName, durationMs: number): Stereo => renderGroove(STYLES[name], durationMs, SEEDS[name]);

export type BedPlan = { bpm: number; barMs: number; downbeatMs: number; closeMs: number; sections: Array<{ bar: number; atMs: number; layers: Layer[] }> };

export const bedPlan = (name: FilmName): BedPlan => {
  const style = STYLES[name];
  const barMs = (60000 * 4) / style.bpm;
  const at = (bar: number): number => Math.round(style.downbeatMs + bar * barMs);
  return { bpm: style.bpm, barMs: Number(barMs.toFixed(2)), downbeatMs: style.downbeatMs, closeMs: at(style.closeBar), sections: style.sections.map((s) => ({ bar: s.bar, atMs: at(s.bar), layers: s.layers })) };
};
