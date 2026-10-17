export const SAFE_MARGIN = 48;

export const GRID = { bpm: 120, beatMs: 500, barMs: 2000, originMs: 0 } as const;

export const onBeat = (ms: number): boolean => (ms - GRID.originMs) % GRID.beatMs === 0;

export type Shot = { at: number; duration: number; scale: number; anchor?: string };

export type Cue = { text: string; at: number; until: number };

export type Key = { key: string; at: number; until?: number };

export type IslandShot = { at: number; until?: number; shape: "island" | "line"; open?: number; draw?: number; y?: number };

export type Rule = { anchor: string; at: number };

export type FilmScript = {
  name: "sidecar" | "sage" | "shell";
  duration: number;
  poster: number;
  close: number;
  title: Cue & { tone?: "inverse" };
  lines: string[];
  keys: readonly Key[];
  island: IslandShot[];
  rules: Rule[];
  rig: { at?: number; until: number; shots: Shot[] };
  end: { text: string; at: number };
};
