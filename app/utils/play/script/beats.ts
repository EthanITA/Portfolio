import { SAGE_SCRIPT } from "./sage.ts";
import { SHELL_SCRIPT } from "./shell.ts";
import { SIDECAR_SCRIPT } from "./sidecar.ts";

export type Toy = "sage" | "shell" | "sidecar";

// x, y and size are fractions of the playground, so a region keeps the frame's 16:10.
export type BeatRegion = { x: number; y: number; size: number };

export type PlayBeat = { id: string; from: number; still: number; region: BeatRegion };

export type ToyBeats = { frame: { width: number; height: number }; beats: PlayBeat[] };

// Show me starts the demo one beat early, so the eye has landed before the moment.
const LEAD = 500;

const shell = SHELL_SCRIPT.moments;
const sage = SAGE_SCRIPT.moments;
const sidecar = SIDECAR_SCRIPT.moments;

// The terminal is shot whole at 800x500, where its long lines wrap instead of running out of the crop.
const TERMINAL: BeatRegion = { x: 0, y: 0, size: 1 };
const ISLAND: BeatRegion = { x: 0.25, y: 0, size: 0.5 };

export const BEATS: Record<Toy, ToyBeats> = {
  shell: {
    frame: { width: 800, height: 500 },
    beats: [
      { id: "looks", from: shell.typeFind - LEAD, still: shell.typeDist - LEAD, region: TERMINAL },
      { id: "changes", from: shell.typeDist - LEAD, still: SHELL_SCRIPT.still, region: TERMINAL },
      { id: "undone", from: shell.typePush - LEAD, still: shell.answerNo - 1000, region: TERMINAL },
      { id: "pipe", from: shell.typePipe - LEAD, still: shell.answerPipe + 1000, region: TERMINAL },
    ],
  },
  sage: {
    frame: { width: 1600, height: 1000 },
    beats: [
      { id: "talk", from: sage.optionDown - LEAD, still: sage.release - LEAD, region: ISLAND },
      { id: "steps", from: sage.goal - LEAD, still: sage.cardIn - 1000, region: ISLAND },
      { id: "asks", from: sage.cardIn - LEAD, still: SAGE_SCRIPT.still, region: ISLAND },
      { id: "hands", from: sage.hold2 - LEAD, still: sage.handBack + 1000, region: ISLAND },
    ],
  },
  sidecar: {
    frame: { width: 1600, height: 1000 },
    beats: [
      { id: "review", from: sidecar.row3 - LEAD, still: SIDECAR_SCRIPT.still, region: { x: 0.49, y: 0.065, size: 0.5 } },
      { id: "comments", from: sidecar.artifacts - LEAD, still: sidecar.addToTray - 250, region: { x: 0.4075, y: 0.065, size: 0.5 } },
      { id: "follows", from: sidecar.tellStart - LEAD, still: sidecar.reply + 1000, region: { x: 0, y: 0.5, size: 0.5 } },
    ],
  },
};
