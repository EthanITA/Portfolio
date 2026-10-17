export type BeatRegion = { x: number; y: number; size: number };

const TERMINAL: BeatRegion = { x: 0, y: 0, size: 1 };
const ISLAND: BeatRegion = { x: 0.325, y: 0, size: 0.35 };

// Fractions of the beat frame, sized so each crop lands near the product's real size in its card: 560x350 two-up, 336x210 three-up.
export const REGIONS: Record<string, BeatRegion> = {
  looks: TERMINAL,
  changes: TERMINAL,
  undone: TERMINAL,
  pipe: TERMINAL,
  talk: ISLAND,
  steps: ISLAND,
  asks: ISLAND,
  hands: ISLAND,
  review: { x: 0.6375, y: 0.022, size: 0.21 },
  comments: { x: 0.418_125, y: 0.188, size: 0.21 },
  follows: { x: 0.016_25, y: 0.762, size: 0.21 },
};
