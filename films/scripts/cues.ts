import sage from "../audio/sage/cues.json" with { type: "json" };
import shell from "../audio/shell/cues.json" with { type: "json" };
import sidecar from "../audio/sidecar/cues.json" with { type: "json" };
import type { Cue } from "./script.ts";

type SoundCue = { stem: string; atMs: number; durMs: number; text?: string };

const SHEETS = { sage, shell, sidecar };

// Only sound knows how long a spoken line runs, so voice captions are the one thing read back from its sheet.
export const voiceOf = (film: keyof typeof SHEETS): Cue[] =>
  (SHEETS[film].cues as SoundCue[]).filter((cue) => cue.stem === "voice" && cue.text).map((cue) => ({ text: cue.text ?? "", at: cue.atMs, until: cue.atMs + cue.durMs + 400 }));
