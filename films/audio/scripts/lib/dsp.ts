import { SAMPLE_RATE } from "./audio";

export const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

export type Biquad = (x: number) => number;

type FilterKind = "lowpass" | "highpass" | "bandpass";

export const biquad = (kind: FilterKind, freq: number, q = 0.707): Biquad => {
  const w = (2 * Math.PI * freq) / SAMPLE_RATE;
  const alpha = Math.sin(w) / (2 * q);
  const cos = Math.cos(w);
  let b0 = 0, b1 = 0, b2 = 0;
  if (kind === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else if (kind === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  } else {
    b0 = alpha;
    b2 = -alpha;
  }
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
};

export const peaking = (freq: number, q: number, gainDb: number): Biquad => {
  const a = 10 ** (gainDb / 40);
  const w = (2 * Math.PI * freq) / SAMPLE_RATE;
  const alpha = Math.sin(w) / (2 * q);
  const cos = Math.cos(w);
  const a0 = 1 + alpha / a;
  const b0 = (1 + alpha * a) / a0;
  const b1 = (-2 * cos) / a0;
  const b2 = (1 - alpha * a) / a0;
  const a2 = (1 - alpha / a) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - b1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
};

export const smooth = (t: number): number => t * t * (3 - 2 * t);

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

export const fadeEdges = (x: Float32Array, inSamples: number, outSamples: number): void => {
  const n = x.length;
  for (let i = 0; i < Math.min(inSamples, n); i++) x[i]! *= 0.5 - 0.5 * Math.cos((Math.PI * i) / inSamples);
  for (let i = 0; i < Math.min(outSamples, n); i++) x[n - 1 - i]! *= 0.5 - 0.5 * Math.cos((Math.PI * i) / outSamples);
};

export const normalizeTo = (x: Float32Array, peak: number): Float32Array => {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]!));
  if (!p) return x;
  const g = peak / p;
  for (let i = 0; i < x.length; i++) x[i]! *= g;
  return x;
};
