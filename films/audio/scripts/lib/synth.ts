import { SAMPLE_RATE, type Stereo, blank, peakOf } from "./audio";
import { biquad, clamp01, fadeEdges, normalizeTo, rng, smooth } from "./dsp";

export const D4 = 293.66;
export const D5 = 587.33;
export const A5 = 880;
export const D7 = 2349.32;
export const A6 = 1760;

export type KeyVariant = "tap" | "down" | "up";
export type ClickVariant = "soft" | "approve" | "reject";
export type TickVariant = "high" | "low";

const seconds = (n: number): number => Math.round(n * SAMPLE_RATE);

const centered = (mono: Float32Array, pan = 0): Stereo => {
  const angle = ((pan + 1) * Math.PI) / 4;
  const l = Math.cos(angle);
  const r = Math.sin(angle);
  const s = blank(mono.length);
  for (let i = 0; i < mono.length; i++) {
    s.l[i] = mono[i]! * l;
    s.r[i] = mono[i]! * r;
  }
  return s;
};

export const key = (variant: KeyVariant, seed: number): Stereo => {
  const rand = rng(seed);
  const n = seconds(0.12);
  const base = { tap: 190, down: 125, up: 250 }[variant];
  const f0 = base * (1 + (rand() - 0.5) * 0.12);
  const tau = variant === "down" ? 0.03 : 0.018;
  const bp = biquad("bandpass", 2400 * (1 + (rand() - 0.5) * 0.2), 0.9);
  const soft = biquad("lowpass", 5200);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const body = Math.sin(2 * Math.PI * f0 * t) * Math.exp(-t / tau);
    const click = bp(rand() * 2 - 1) * Math.exp(-t / 0.0045);
    x[i] = soft(0.6 * body + 0.5 * click);
  }
  fadeEdges(x, 0, seconds(0.02));
  return centered(normalizeTo(x, 1), (rand() - 0.5) * 0.3);
};

export const tick = (variant: TickVariant, seed: number): Stereo => {
  const rand = rng(seed);
  const f = variant === "high" ? D7 : A6;
  const n = seconds(0.09);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.0004);
    x[i] =
      attack *
      (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.007) +
        0.25 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t / 0.004));
  }
  fadeEdges(x, 0, seconds(0.015));
  return centered(normalizeTo(x, 1), (rand() - 0.5) * 0.2);
};

export const click = (variant: ClickVariant, seed: number): Stereo => {
  const rand = rng(seed);
  const f = { soft: 420, approve: 520, reject: 330 }[variant];
  const bp = biquad("bandpass", 3000, 0.8);
  const n = seconds(0.1);
  const crisp = new Float32Array(n);
  const body = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    crisp[i] = bp(rand() * 2 - 1) * Math.exp(-t / 0.003);
    body[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.012);
  }
  normalizeTo(crisp, 1);
  const x = body.map((v, i) => 0.55 * v + 0.8 * crisp[i]!);
  fadeEdges(x, 0, seconds(0.02));
  return centered(normalizeTo(x, 1), (rand() - 0.5) * 0.2);
};

export const chime = (): Stereo => {
  const n = seconds(1.2);
  const x = new Float32Array(n);
  const notes: Array<{ f: number; at: number }> = [
    { f: D5, at: 0 },
    { f: A5, at: 0.13 },
  ];
  for (const note of notes) {
    for (let i = seconds(note.at); i < n; i++) {
      const t = i / SAMPLE_RATE - note.at;
      const attack = Math.min(1, t / 0.003);
      const w = 2 * Math.PI * note.f * t;
      x[i]! +=
        attack *
        (Math.sin(w) * Math.exp(-t / 0.28) +
          0.18 * Math.sin(2 * w) * Math.exp(-t / 0.18) +
          0.07 * Math.sin(2.76 * w) * Math.exp(-t / 0.08));
    }
  }
  fadeEdges(x, 0, seconds(0.2));
  return centered(normalizeTo(x, 1));
};

export const thud = (): Stereo => {
  const n = seconds(0.55);
  const rand = rng(7);
  const lp = biquad("lowpass", 220);
  const muted = biquad("lowpass", 380);
  const x = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    phase += (2 * Math.PI * (52 + 40 * Math.exp(-t / 0.03))) / SAMPLE_RATE;
    const body = Math.cos(phase) * Math.exp(-t / 0.11) * Math.min(1, t / 0.0015);
    const knock = lp(rand() * 2 - 1) * Math.exp(-t / 0.012) * 0.5;
    x[i] = muted(body + knock);
  }
  fadeEdges(x, 0, seconds(0.15));
  return centered(normalizeTo(x, 1));
};

export const line = (durMs: number): Stereo => {
  const long = durMs > 2000;
  const glide = seconds(durMs / 1000);
  const ring = seconds(long ? 0.45 : 0.3);
  const n = glide + ring;
  const attack = seconds(long ? 0.12 : 0.025);
  const soft = biquad("lowpass", 4200);
  const x = new Float32Array(n);
  let phaseA = 0;
  let phaseB = 0;
  for (let i = 0; i < n; i++) {
    const u = clamp01(i / glide);
    const g = long ? u : 1 - (1 - u) ** 3;
    const f = D4 * 2 ** g;
    phaseA += (2 * Math.PI * f) / SAMPLE_RATE;
    phaseB += (2 * Math.PI * f * 1.0023) / SAMPLE_RATE;
    const tone =
      Math.sin(phaseA) + 0.22 * Math.sin(2 * phaseA) + 0.08 * Math.sin(3 * phaseA) + 0.5 * Math.sin(phaseB);
    const rise = long ? 0.25 + 0.75 * u : 1;
    const tail = i < glide ? 1 : Math.exp(-(i - glide) / SAMPLE_RATE / (long ? 0.16 : 0.1));
    const head = Math.min(1, i / attack);
    x[i] = soft(tone * rise * tail * smooth(head));
  }
  fadeEdges(x, 0, seconds(0.05));
  return centered(normalizeTo(x, 1));
};

export type WhooshDirection = "ltr" | "rtl" | "still";

export const whoosh = (durMs: number, fromHz: number, toHz: number, direction: WhooshDirection, seed: number): Stereo => {
  const n = seconds(durMs / 1000);
  const rand = rng(seed);
  const s = blank(n);
  const q = 1.1;
  let low = 0;
  let band = 0;
  const pre = biquad("lowpass", 9000);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const fc = fromHz * (toHz / fromHz) ** u;
    const f = 2 * Math.sin((Math.PI * fc) / SAMPLE_RATE);
    const input = pre(rand() * 2 - 1);
    const high = input - low - band / q;
    band += f * high;
    low += f * band;
    const env = u < 0.4 ? Math.sin((Math.PI / 2) * (u / 0.4)) ** 2 : Math.cos((Math.PI / 2) * ((u - 0.4) / 0.6)) ** 2;
    const pan = direction === "still" ? 0 : (direction === "ltr" ? -1 : 1) * 0.5 * (1 - 2 * u);
    const angle = ((pan + 1) * Math.PI) / 4;
    const v = band * env;
    s.l[i] = v * Math.cos(angle);
    s.r[i] = v * Math.sin(angle);
  }
  const peak = peakOf(s);
  for (let i = 0; i < n; i++) {
    s.l[i]! /= peak;
    s.r[i]! /= peak;
  }
  return s;
};

export const room = (input: Stereo): Stereo => {
  const out = blank(input.l.length);
  const leftDelays = [0.0297, 0.0371, 0.0411, 0.0437];
  const rightDelays = [0.0311, 0.0353, 0.0427, 0.0449];
  const run = (x: Float32Array, y: Float32Array, delays: number[]): void => {
    const lengths = delays.map(seconds);
    const buffers = lengths.map((d) => new Float32Array(d));
    const damp = new Float32Array(lengths.length);
    const gains = lengths.map((d) => 10 ** ((-3 * (d / SAMPLE_RATE)) / 0.45));
    const idx = new Int32Array(lengths.length);
    for (let i = 0; i < x.length; i++) {
      let sum = 0;
      for (let c = 0; c < lengths.length; c++) {
        const buf = buffers[c]!;
        const read = buf[idx[c]!]!;
        damp[c] = read * 0.62 + damp[c]! * 0.38;
        buf[idx[c]!] = x[i]! + damp[c]! * gains[c]!;
        idx[c] = (idx[c]! + 1) % lengths[c]!;
        sum += read;
      }
      y[i] = sum * 0.25;
    }
  };
  run(input.l, out.l, leftDelays);
  run(input.r, out.r, rightDelays);
  return out;
};
