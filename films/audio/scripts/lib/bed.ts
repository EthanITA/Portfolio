import type { FilmName } from "../films";
import { SAMPLE_RATE, type Stereo, blank, samplesAt } from "./audio";
import { biquad, rng, smooth } from "./dsp";

type Style = { padDb: number; cutoff: number; bellEveryMs: number; pulseDb: number; wet: number; bellDb: number };

const STYLES: Record<FilmName, Style> = {
  sidecar: { padDb: 0, cutoff: 1500, bellEveryMs: 4200, pulseDb: -15, wet: 0.5, bellDb: -17 },
  sage: { padDb: -2, cutoff: 1000, bellEveryMs: 7000, pulseDb: -17, wet: 0.55, bellDb: -20 },
  shell: { padDb: -3, cutoff: 1250, bellEveryMs: 5600, pulseDb: -12, wet: 0.32, bellDb: -19 },
};

const midi = (m: number): number => 440 * 2 ** ((m - 69) / 12);

const CHORDS: Array<{ root: number; voices: number[] }> = [
  { root: midi(38), voices: [50, 57, 64, 66].map(midi) },
  { root: midi(35), voices: [54, 57, 62, 64].map(midi) },
  { root: midi(31), voices: [50, 55, 59, 64].map(midi) },
  { root: midi(33), voices: [52, 57, 61, 64].map(midi) },
];

const BELLS = [74, 76, 78, 81, 83, 86].map(midi);
const CHORD_MS = 8000;
const TABLE = 4096;
const ATTACK = SAMPLE_RATE * 2.2;
const RELEASE = SAMPLE_RATE * 3.2;

const saw = ((): Float32Array => {
  const t = new Float32Array(TABLE);
  for (let h = 1; h <= 16; h++) for (let i = 0; i < TABLE; i++) t[i]! += Math.sin((2 * Math.PI * h * i) / TABLE) / h;
  return t;
})();

const lookup = (phase: number): number => {
  const p = (phase - Math.floor(phase)) * TABLE;
  const i = Math.floor(p);
  const f = p - i;
  return saw[i]! * (1 - f) + saw[(i + 1) % TABLE]! * f;
};

type Segment = { start: number; end: number; chord: number };

const plan = (total: number): Segment[] => {
  const out: Segment[] = [];
  const last = Math.max(0, total - samplesAt(13000));
  let k = 0;
  for (let s = 0; s < last; s += samplesAt(CHORD_MS), k++) out.push({ start: s, end: s + samplesAt(CHORD_MS), chord: k % CHORDS.length });
  out.push({ start: out.at(-1)?.end ?? 0, end: total, chord: 0 });
  return out;
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

const envelope = (i: number, seg: Segment): number => {
  const rise = smooth(Math.min(1, (i - seg.start) / ATTACK));
  const fall = i < seg.end ? 1 : smooth(1 - (i - seg.end) / RELEASE);
  return rise * fall;
};

const addPad = (pad: Stereo, seg: Segment, padGain: number, rand: () => number): void => {
  const chord = CHORDS[seg.chord]!;
  const tail = Math.min(pad.l.length, seg.end + RELEASE);
  chord.voices.forEach((f, v) => {
    for (let o = 0; o < 3; o++) {
      const base = f * 2 ** (([-7, 0, 7][o]! + (rand() - 0.5) * 2) / 1200);
      const drift = 0.0006 * (0.5 + rand());
      const rate = 0.09 + 0.08 * rand();
      const phi = rand() * 2 * Math.PI;
      const angle = ((Math.max(-1, Math.min(1, (o - 1) * 0.55 + (v - 1.5) * 0.12)) + 1) * Math.PI) / 4;
      const gl = Math.cos(angle);
      const gr = Math.sin(angle);
      let phase = rand();
      for (let i = seg.start; i < tail; i++) {
        phase += (base * (1 + drift * Math.sin(2 * Math.PI * rate * (i / SAMPLE_RATE) + phi))) / SAMPLE_RATE;
        const s = lookup(phase) * envelope(i, seg) * padGain;
        pad.l[i]! += s * gl;
        pad.r[i]! += s * gr;
      }
    }
  });
  let phase = 0;
  for (let i = seg.start; i < tail; i++) {
    phase += (2 * Math.PI * chord.root) / SAMPLE_RATE;
    const s = (Math.sin(phase) + 0.35 * Math.sin(2 * phase)) * envelope(i, seg) * padGain * 1.4;
    pad.l[i]! += s;
    pad.r[i]! += s;
  }
};

export const synthBed = (name: FilmName, durationMs: number): Stereo => {
  const style = STYLES[name];
  const total = samplesAt(durationMs);
  const rand = rng(900 + name.length);
  const segments = plan(total);

  const pad = blank(total);
  for (const seg of segments) addPad(pad, seg, 10 ** (style.padDb / 20) * 0.05, rand);
  const lpL = [biquad("lowpass", style.cutoff), biquad("lowpass", style.cutoff)];
  const lpR = [biquad("lowpass", style.cutoff), biquad("lowpass", style.cutoff)];
  const dry = blank(total);
  for (let i = 0; i < total; i++) {
    dry.l[i] = lpL[1]!(lpL[0]!(pad.l[i]!));
    dry.r[i] = lpR[1]!(lpR[0]!(pad.r[i]!));
  }

  const beat = samplesAt(1000);
  const pulse = 10 ** (style.pulseDb / 20) * 0.12;
  for (let b = 0, at = 0; at < total; b++, at += beat) {
    const root = CHORDS[(segments.find((s) => at >= s.start && at < s.end) ?? segments.at(-1)!).chord]!.root;
    const level = (b % 4 === 0 ? 1 : 0.55) * pulse;
    for (let j = 0; j < Math.min(beat, total - at); j++) {
      const t = j / SAMPLE_RATE;
      const s = (Math.sin(2 * Math.PI * root * t) + 0.45 * Math.sin(4 * Math.PI * root * t)) * Math.min(1, t / 0.018) * Math.exp(-t / 0.22) * level;
      dry.l[at + j]! += s;
      dry.r[at + j]! += s;
    }
  }

  const send = new Float32Array(total);
  const bellGain = 10 ** (style.bellDb / 20) * 0.5;
  for (let at = samplesAt(5500 + rand() * 1500); at < total - samplesAt(9000); at += samplesAt(style.bellEveryMs * (0.7 + 0.6 * rand()))) {
    const f = BELLS[Math.floor(rand() * BELLS.length)]!;
    const angle = (((rand() - 0.5) * 1.2 + 1) * Math.PI) / 4;
    for (let j = 0; j < Math.min(samplesAt(3500), total - at); j++) {
      const t = j / SAMPLE_RATE;
      const w = 2 * Math.PI * f * t;
      const s = Math.min(1, t / 0.004) * (Math.sin(w) * Math.exp(-t / 1.1) + 0.12 * Math.sin(2.76 * w) * Math.exp(-t / 0.5) + 0.04 * Math.sin(5.4 * w) * Math.exp(-t / 0.25)) * bellGain;
      dry.l[at + j]! += s * Math.cos(angle);
      dry.r[at + j]! += s * Math.sin(angle);
      send[at + j]! += s;
    }
  }

  for (let i = 0; i < total; i++) send[i]! += (dry.l[i]! + dry.r[i]!) * 0.5;
  const wetL = freeverb(send, 0, 0.88, 0.3);
  const wetR = freeverb(send, 23, 0.88, 0.3);
  const out = blank(total);
  for (let i = 0; i < total; i++) {
    out.l[i] = dry.l[i]! * (1 - style.wet * 0.5) + wetL[i]! * style.wet * 6;
    out.r[i] = dry.r[i]! * (1 - style.wet * 0.5) + wetR[i]! * style.wet * 6;
  }
  return out;
};
