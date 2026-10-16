export const SEQUENCE = {
  frames: 192,
  filmMs: 6400,
  fps: 30,
  aspect: 16 / 9,
  breakAt: 0.8,
  flownBy: 0.92,
  landAt: 0.94,
  spread: 0.08,
  smoothing: 0.63,
} as const;

export const BEAT_RANGES = [
  [0.04, 0.14],
  [0.3, 0.48],
  [0.56, 0.72],
  [0.74, 0.96],
] as const;

export const BEAT_FADE = { in: 0.04, out: 0.03, rise: 16 } as const;

export type Theme = "light" | "dark";

export type Rect = { x: number; y: number; width: number; height: number };

export const frameAt = (progress: number): number =>
  Math.round((Math.min(Math.max(progress, 0), SEQUENCE.breakAt) / SEQUENCE.breakAt) * (SEQUENCE.frames - 1));

export const isBeatVisible = (progress: number, [from, to]: readonly [number, number]): boolean => progress > from && progress < to;

export type FitOptions = { width: number; height: number; safe: readonly [number, number] };

// Scaling to the viewport height keeps the live hero's vertical framing, so the handoff crossfade lines up.
export const fitFrame = ({ width, height, safe: [from, to] }: FitOptions): Rect => {
  let drawWidth = Math.max(height * SEQUENCE.aspect, width);
  const safeWidth = (to - from) * drawWidth;
  if (safeWidth > width * 0.96) drawWidth = (width * 0.96) / (to - from);
  const drawHeight = drawWidth / SEQUENCE.aspect;
  return { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight };
};
