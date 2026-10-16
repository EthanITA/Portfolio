export type Shot = { at: number; duration: number; scale: number; anchor?: string };

export type Cue = { text: string; at: number; until: number };

export type FilmScript = {
  name: "sidecar" | "sage" | "shell";
  duration: number;
  poster: number;
  title: Cue;
  captions: Cue[];
  rig: { at?: number; until?: number; shots: Shot[] };
  end: { text: string; at: number };
};
