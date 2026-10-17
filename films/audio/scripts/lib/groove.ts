import { SAMPLE_RATE, type Stereo, blank, samplesAt } from "./audio";
import { biquad, rng } from "./dsp";

export type Layer = "kick" | "clap" | "hat" | "bass" | "pluck" | "stab";

export type Section = {
  bar: number;
  layers: Layer[];
  patterns?: Partial<Record<Layer, number[]>>;
  once?: Layer[];
};

export type GrooveStyle = {
  bpm: number;
  swing: number;
  downbeatMs: number;
  closeBar: number;
  progression: number[][];
  levelsDb: Record<Layer, number>;
  patterns: Record<Layer, number[]>;
  sections: Section[];
  pumpDepth: number;
  wet: number;
};

const STEPS_PER_BAR = 16;
const TABLE = 4096;
const FIFTH_STEP = 10;
const OPEN_HAT_STEPS = [6, 14];

const midi = (m: number): number => 440 * 2 ** ((m - 69) / 12);
const gain = (db: number): number => 10 ** (db / 20);
const wrap = (n: number, m: number): number => ((n % m) + m) % m;

const saw = ((): Float32Array => {
  const t = new Float32Array(TABLE);
  for (let h = 1; h <= 24; h++) for (let i = 0; i < TABLE; i++) t[i]! += Math.sin((2 * Math.PI * h * i) / TABLE) / h;
  return t;
})();

const lookup = (phase: number): number => {
  const p = (phase - Math.floor(phase)) * TABLE;
  const i = Math.floor(p);
  return saw[i]! * (1 - (p - i)) + saw[(i + 1) % TABLE]! * (p - i);
};

const freeverb = (mono: Float32Array, spread: number, feedback: number, damp: number): Float32Array => {
  const scale = SAMPLE_RATE / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round((d + spread) * scale));
  const allpasses = [556, 441, 341, 225].map((d) => Math.round((d + spread) * scale));
  const combBuf = combs.map((d) => new Float32Array(d));
  const combIdx = new Int32Array(combs.length);
  const combStore = new Float32Array(combs.length);
  const apBuf = allpasses.map((d) => new Float32Array(d));
  const apIdx = new Int32Array(allpasses.length);
  const out = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const x = mono[i]! * 0.015;
    let y = 0;
    for (let c = 0; c < combs.length; c++) {
      const buf = combBuf[c]!;
      const read = buf[combIdx[c]!]!;
      combStore[c] = read * (1 - damp) + combStore[c]! * damp;
      buf[combIdx[c]!] = x + combStore[c]! * feedback;
      combIdx[c] = (combIdx[c]! + 1) % combs[c]!;
      y += read;
    }
    for (let a = 0; a < allpasses.length; a++) {
      const buf = apBuf[a]!;
      const read = buf[apIdx[a]!]!;
      buf[apIdx[a]!] = y + read * 0.5;
      y = read - y;
      apIdx[a] = (apIdx[a]! + 1) % allpasses[a]!;
    }
    out[i] = y;
  }
  return out;
};

const place = (bus: Stereo, at: number, mono: Float32Array, left: number, right: number): void => {
  const n = Math.min(mono.length, bus.l.length - at);
  for (let j = 0; j < n; j++) {
    bus.l[at + j]! += mono[j]! * left;
    bus.r[at + j]! += mono[j]! * right;
  }
};

const pan = (position: number): [number, number] => {
  const angle = ((Math.max(-1, Math.min(1, position)) + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
};

const kickHit = (): Float32Array => {
  const out = new Float32Array(samplesAt(380));
  let phase = 0;
  for (let j = 0; j < out.length; j++) {
    const t = j / SAMPLE_RATE;
    phase += (2 * Math.PI * (47 + 95 * Math.exp(-t / 0.026))) / SAMPLE_RATE;
    out[j] = Math.sin(phase) * Math.min(1, t / 0.0015) * Math.exp(-t / 0.13);
  }
  return out;
};

const noiseHit = (rand: () => number, durMs: number, decayS: number, filter: (x: number) => number, bursts: number[] = [0]): Float32Array => {
  const out = new Float32Array(samplesAt(durMs));
  for (let j = 0; j < out.length; j++) {
    const t = j / SAMPLE_RATE;
    let env = 0;
    for (const b of bursts) if (t >= b) env += Math.exp(-(t - b) / decayS) * Math.min(1, (t - b) / 0.0008);
    out[j] = filter((rand() * 2 - 1) * env);
  }
  return out;
};

const bassNote = (freq: number, lengthS: number): Float32Array => {
  const out = new Float32Array(samplesAt(lengthS * 1000 + 40));
  const lp = biquad("lowpass", 520, 1.1);
  let phase = 0;
  for (let j = 0; j < out.length; j++) {
    const t = j / SAMPLE_RATE;
    phase += freq / SAMPLE_RATE;
    const env = Math.min(1, t / 0.006) * (t < lengthS ? 0.55 + 0.45 * Math.exp(-t / 0.09) : Math.exp(-(t - lengthS) / 0.012) * 0.55);
    out[j] = (lp(lookup(phase)) * 0.8 + Math.sin(2 * Math.PI * freq * t) * 0.7) * env;
  }
  return out;
};

const pluckNote = (freq: number): Float32Array => {
  const out = new Float32Array(samplesAt(520));
  for (let j = 0; j < out.length; j++) {
    const t = j / SAMPLE_RATE;
    const w = 2 * Math.PI * freq * t;
    const body = Math.sin(w) + 0.35 * Math.sin(2 * w) * Math.exp(-t / 0.06) + 0.12 * Math.sin(3.01 * w) * Math.exp(-t / 0.03);
    out[j] = body * Math.min(1, t / 0.0012) * Math.exp(-t / 0.12);
  }
  return out;
};

const stabChord = (freqs: number[], lengthS: number): Float32Array => {
  const out = new Float32Array(samplesAt(lengthS * 1000 + 120));
  const lp = biquad("lowpass", 1700, 0.8);
  const voices = freqs.flatMap((f) => [f * 0.997, f * 1.003]).map((f, i) => ({ f, phase: (i * 0.37) % 1 }));
  const decay = Math.max(0.05, lengthS * 0.55);
  for (let j = 0; j < out.length; j++) {
    const t = j / SAMPLE_RATE;
    let s = 0;
    for (const v of voices) {
      v.phase += v.f / SAMPLE_RATE;
      s += lookup(v.phase);
    }
    const env = Math.min(1, t / 0.004) * (t < lengthS ? Math.exp(-t / decay) : Math.exp(-(t - lengthS) / 0.05) * Math.exp(-lengthS / decay));
    out[j] = lp(s / voices.length) * env;
  }
  return out;
};

const sectionAt = (style: GrooveStyle, bar: number): Section | undefined => [...style.sections].reverse().find((s) => bar >= s.bar);

const levelOf = (style: GrooveStyle, layer: Layer, bar: number, beatInBar: number): number => {
  const on = (b: number): boolean => Boolean(sectionAt(style, b)?.layers.includes(layer));
  if (!on(bar)) return 0;
  if (!on(bar - 1)) return Math.min(1, (beatInBar + 1) / 4) ** 1.5;
  return 1;
};

export const renderGroove = (style: GrooveStyle, durationMs: number, seed: number): Stereo => {
  const total = samplesAt(durationMs);
  const rand = rng(seed);
  const beatSamples = (60 / style.bpm) * SAMPLE_RATE;
  const stepSamples = beatSamples / 4;
  const downbeat = samplesAt(style.downbeatMs);
  const firstStep = -Math.floor(downbeat / stepSamples);
  const lastStep = Math.ceil((total - downbeat) / stepSamples);

  const drums = blank(total);
  const bass = blank(total);
  const plucks = blank(total);
  const stabs = blank(total);
  const kicks: number[] = [];

  const kick = kickHit();
  const clap = noiseHit(rand, 160, 0.045, biquad("bandpass", 1500, 0.9), [0, 0.011, 0.022]);
  const hats = [noiseHit(rand, 90, 0.016, biquad("highpass", 7200)), noiseHit(rand, 220, 0.07, biquad("highpass", 6500))];

  const voices = (layer: Layer): Array<{ at: number; velocity: number; step: number }> => {
    const out: Array<{ at: number; velocity: number; step: number }> = [];
    const spent = new Set<number>();
    for (let step = firstStep; step < lastStep; step++) {
      const bar = Math.floor(step / STEPS_PER_BAR);
      if (bar >= style.closeBar) break;
      const inBar = wrap(step, STEPS_PER_BAR);
      const section = sectionAt(style, bar);
      const velocity = (section?.patterns?.[layer] ?? style.patterns[layer])[inBar] ?? 0;
      if (!velocity) continue;
      const single = section?.once?.includes(layer) ? section : undefined;
      const level = single ? 1 : levelOf(style, layer, bar, Math.floor(inBar / 4));
      if (!level) continue;
      if (single) {
        if (spent.has(single.bar)) continue;
        spent.add(single.bar);
      }
      const at = Math.round(downbeat + step * stepSamples + (inBar % 2 === 1 ? style.swing * stepSamples : 0));
      if (at < 0 || at >= total) continue;
      out.push({ at, velocity: velocity * level, step });
    }
    return out;
  };

  const kickGain = gain(style.levelsDb.kick);
  for (const v of voices("kick")) {
    place(drums, v.at, kick, v.velocity * kickGain, v.velocity * kickGain);
    kicks.push(v.at);
  }
  const clapGain = gain(style.levelsDb.clap);
  for (const v of voices("clap")) {
    const [l, r] = pan(0.08);
    place(drums, v.at, clap, v.velocity * clapGain * l, v.velocity * clapGain * r);
  }
  voices("hat").forEach((v, i) => {
    const [l, r] = pan(i % 2 ? 0.3 : -0.3);
    const g = v.velocity * (0.85 + 0.3 * rand()) * gain(style.levelsDb.hat);
    place(drums, v.at, hats[OPEN_HAT_STEPS.includes(wrap(v.step, STEPS_PER_BAR)) ? 1 : 0]!, g * l, g * r);
  });

  const chordAt = (step: number): number[] => style.progression[wrap(Math.floor(step / STEPS_PER_BAR), style.progression.length)]!;

  const bassGain = gain(style.levelsDb.bass);
  for (const v of voices("bass")) {
    const chord = chordAt(v.step);
    const note = wrap(v.step, STEPS_PER_BAR) === FIFTH_STEP ? chord[0]! - 17 : chord[0]! - 24;
    place(bass, v.at, bassNote(midi(note), (stepSamples * 1.6) / SAMPLE_RATE), v.velocity * bassGain, v.velocity * bassGain);
  }

  const pluckGain = gain(style.levelsDb.pluck);
  voices("pluck").forEach((v, i) => {
    const chord = chordAt(v.step);
    const [l, r] = pan(Math.sin(i * 1.9) * 0.6);
    place(plucks, v.at, pluckNote(midi(chord[i % chord.length]! + 12)), v.velocity * pluckGain * l, v.velocity * pluckGain * r);
  });

  const stabGain = gain(style.levelsDb.stab);
  for (const v of voices("stab")) {
    place(stabs, v.at, stabChord(chordAt(v.step).map(midi), (stepSamples * 1.7) / SAMPLE_RATE), v.velocity * stabGain, v.velocity * stabGain);
  }

  const closing = style.progression[0]!;
  const closeAt = Math.round(downbeat + style.closeBar * STEPS_PER_BAR * stepSamples);
  if (closeAt < total) {
    place(drums, closeAt, kick, kickGain, kickGain);
    place(bass, closeAt, bassNote(midi(closing[0]! - 24), 2.4), bassGain, bassGain);
    place(stabs, closeAt, stabChord(closing.map(midi), 2.6), stabGain, stabGain);
    kicks.push(closeAt);
  }

  const pump = new Float32Array(total).fill(1);
  for (const k of kicks) {
    const n = Math.min(samplesAt(260), total - k);
    for (let j = 0; j < n; j++) {
      const t = j / SAMPLE_RATE;
      pump[k + j] = Math.min(pump[k + j]!, 1 - style.pumpDepth * Math.min(1, t / 0.004) * Math.exp(-t / 0.11));
    }
  }

  const d = Math.round(beatSamples * 0.75);
  const echoL = new Float32Array(total);
  const echoR = new Float32Array(total);
  const dampL = biquad("lowpass", 3200);
  const dampR = biquad("lowpass", 3200);
  for (let i = 0; i < total; i++) {
    const late = i >= d;
    const x = late ? (plucks.l[i - d]! + plucks.r[i - d]!) * 0.5 : 0;
    echoL[i] = dampL(x + (late ? 0.5 * echoR[i - d]! : 0));
    echoR[i] = dampR(late ? 0.5 * echoL[i - d]! : 0);
  }

  const send = new Float32Array(total);
  const out = blank(total);
  for (let i = 0; i < total; i++) {
    const m = pump[i]!;
    out.l[i] = drums.l[i]! + (bass.l[i]! + stabs.l[i]! + plucks.l[i]! + echoL[i]!) * m;
    out.r[i] = drums.r[i]! + (bass.r[i]! + stabs.r[i]! + plucks.r[i]! + echoR[i]!) * m;
    send[i] = (stabs.l[i]! + stabs.r[i]! + plucks.l[i]! + plucks.r[i]!) * 0.5 * m;
  }
  const wetL = freeverb(send, 0, 0.8, 0.35);
  const wetR = freeverb(send, 23, 0.8, 0.35);
  for (let i = 0; i < total; i++) {
    out.l[i] = Math.tanh((out.l[i]! + wetL[i]! * style.wet * 6) * 1.4) / 1.4;
    out.r[i] = Math.tanh((out.r[i]! + wetR[i]! * style.wet * 6) * 1.4) / 1.4;
  }
  return out;
};
