export type BeatFrame = { width: number; height: number };
export type BeatRegion = { frame: BeatFrame; x: number; y: number; width: number; height: number };

// The terminal is shot whole, where its 13 px lines read 10.96 px in the 472 px card, the floor as ruled.
const SHELL: BeatFrame = { width: 560, height: 350 };
const SAGE: BeatFrame = { width: 1600, height: 1000 };
// Wide enough that the review face keeps its hunks column at 328 px; the hunk's 10 px code stays under the floor as texture.
const SIDECAR: BeatFrame = { width: 1000, height: 625 };
// The terminal pane only fits a 336 crop without cutting a row below 960 wide, where the review face stacks.
const SIDECAR_TERMINAL: BeatFrame = { width: 900, height: 560 };

const whole = (frame: BeatFrame): BeatRegion => ({ frame, x: 0, y: 0, ...frame });
const ISLAND: BeatRegion = { frame: SAGE, x: 520, y: 0, width: 560, height: 350 };

export const REGIONS: Record<string, BeatRegion> = {
  looks: whole(SHELL),
  changes: whole(SHELL),
  undone: whole(SHELL),
  pipe: whole(SHELL),
  talk: ISLAND,
  steps: ISLAND,
  asks: ISLAND,
  hands: ISLAND,
  // The three seams are the subject; the file path above them would stretch it to 242 px against the 210 crop.
  review: { frame: SIDECAR, x: 638, y: 144, width: 336, height: 210 },
  comments: { frame: SIDECAR, x: 420, y: 250, width: 336, height: 210 },
  follows: { frame: SIDECAR_TERMINAL, x: 17, y: 350, width: 336, height: 210 },
};
