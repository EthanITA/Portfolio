import { MOTION_EASE } from "@cela/design/utils/motion";

export const SEQUENCE = {
  frames: 192,
  filmMs: 6400,
  fps: 30,
  aspect: 16 / 9,
  breakAt: 0.8,
  flownBy: 0.92,
  landAt: 0.94,
  spread: 0.08,
} as const;

export const BEAT_RANGES = [
  [0.04, 0.14],
  [0.3, 0.48],
  [0.56, 0.72],
  [0.74, 0.96],
] as const;

export const BEAT_FADE = { in: 0.04, out: 0.03, rise: 16 } as const;

export type Rect = { x: number; y: number; width: number; height: number };

export const framePosition = (progress: number): number => (Math.min(Math.max(progress, 0), SEQUENCE.breakAt) / SEQUENCE.breakAt) * (SEQUENCE.frames - 1);

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

export const beatStyle = (progress: number, [from, to]: readonly [number, number]): { opacity: number; rise: number } => {
  const enter = MOTION_EASE.out(clamp01((progress - from) / BEAT_FADE.in));
  const exit = MOTION_EASE.out(clamp01((progress - to + BEAT_FADE.out) / BEAT_FADE.out));
  return { opacity: enter * (1 - exit), rise: BEAT_FADE.rise * (1 - enter) };
};

export const cardOpacity = (progress: number): number => clamp01((progress - SEQUENCE.landAt) / (1 - SEQUENCE.landAt));

export const FIT = { from: 0.12, to: 0.45 } as const;

export type FitOptions = { width: number; height: number; safe: readonly [number, number]; progress?: number };

// Frame 0 covers like the live hero's stage; the cap that keeps the trio on screen eases in with the push-in.
export const fitFrame = ({ width, height, safe: [from, to], progress = 1 }: FitOptions): Rect => {
  const cover = Math.max(height * SEQUENCE.aspect, width);
  const capped = Math.min(cover, (width * 0.96) / (to - from));
  const drawWidth = cover + (capped - cover) * MOTION_EASE.inOut(clamp01((progress - FIT.from) / (FIT.to - FIT.from)));
  const drawHeight = drawWidth / SEQUENCE.aspect;
  return { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight };
};
