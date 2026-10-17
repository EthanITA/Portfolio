export const SAFE_MARGIN = 48;

export type Shot = { at: number; duration: number; scale: number; anchor?: string };

export type Cue = { text: string; at: number; until: number };

export type Key = { key: string; at: number; until?: number };

export type IslandShot = { at: number; until?: number; shape: "island" | "line"; open?: number; draw?: number; y?: number };

export type Rule = { anchor: string; at: number };

export type FilmScript = {
  name: "sidecar" | "sage" | "shell";
  duration: number;
  poster: number;
  title: Cue & { tone?: "inverse" };
  captions: Cue[];
  keys: readonly Key[];
  island: IslandShot[];
  rules: Rule[];
  rig: { at?: number; until?: number; shots: Shot[] };
  end: { text: string; at: number };
};
