import sage from "../audio/sage/cues.json" with { type: "json" };
import shell from "../audio/shell/cues.json" with { type: "json" };
import sidecar from "../audio/sidecar/cues.json" with { type: "json" };

type SoundCue = { id: string; stem: string; atMs: number; durMs: number; text?: string };

const SHEETS = { sage, shell, sidecar };

export type Cues = { at: (id: string) => number; voice: () => { text: string; at: number; until: number }[] };

// sound's cue sheet is foreign JSON, and every moment the film shares with the mix is read from it so the two never drift.
export const cuesOf = (film: keyof typeof SHEETS): Cues => {
  const list = SHEETS[film].cues as SoundCue[];
  const at = (id: string): number => {
    const cue = list.find((candidate) => candidate.id === id);
    if (!cue) throw new Error(`films/audio/${film}/cues.json has no cue "${id}"`);
    return cue.atMs;
  };
  const voice = (): { text: string; at: number; until: number }[] =>
    list.filter((cue) => cue.stem === "voice" && cue.text).map((cue) => ({ text: cue.text ?? "", at: cue.atMs, until: cue.atMs + cue.durMs + 400 }));
  return { at, voice };
};
