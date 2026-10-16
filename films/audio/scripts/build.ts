import { createHash } from "node:crypto";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type Loudness, type Stereo, SAMPLE_RATE, blank, decode, decodeMono, encodeFlac, fromDb, measure, msAt, peakOf, samplesAt, toDb, writeWav24,
} from "./lib/audio";
import { fadeEdges, hash, rng } from "./lib/dsp";
import { writeJson } from "./lib/openrouter";
import * as synth from "./lib/synth";
import { type CueSpec, FILMS, type FilmName, type FilmSpec } from "./films";

export const ROOT = join(import.meta.dirname, "..");
export const TARGET_LUFS = -16;
export const MAX_TRUE_PEAK = -1.5;

const PEAK_DB = { key: -26, tick: -15, click: -17, chime: -11, thud: -9, line: -15, whoosh: -19, voice: -5 };
const MIN_KEY_GAP_MS = 55;
const VOICE_PREROLL = samplesAt(6);

type Stem = "ui" | "voice";

export type Placed = {
  id: string;
  sound: string;
  stem: Stem;
  atMs: number;
  durMs: number;
  marks: string;
  sheet: string;
  audible: boolean;
  tolMs: number;
  text?: string;
  group?: string;
  buffer?: Stereo;
  gain: number;
  offset: number;
};

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export const pressTimes = (startMs: number, endMs: number, text: string, seed: number): number[] => {
  const rand = rng(seed);
  const gaps = Array.from({ length: text.length - 1 }, (_, i) => (1 + (rand() - 0.5) * 0.5) * (text[i] === " " ? 1.4 : 1));
  const total = sum(gaps);
  let acc = 0;
  return [startMs, ...gaps.map((g) => Math.round(startMs + ((endMs - startMs) * (acc += g)) / total))];
};

const durMsOf = (s: Stereo): number => msAt(s.l.length);

const expand = (film: FilmSpec): Placed[] => {
  const placed: Placed[] = [];
  const seed = (id: string): number => hash(`${film.name}/${id}`);
  for (const cue of film.cues) {
    const common = { id: cue.id, atMs: cue.at, marks: cue.marks, sheet: cue.sheet, audible: true, gain: fromDb(cue.gainDb ?? 0), offset: 0 };
    switch (cue.sound) {
      case "typing": {
        const times = pressTimes(cue.at, cue.endMs, cue.text, seed(cue.id));
        let last = -Infinity;
        times.forEach((t, i) => {
          const audible = t - last >= MIN_KEY_GAP_MS;
          if (audible) last = t;
          const buffer = synth.key("tap", seed(`${cue.id}/${i}`));
          placed.push({
            ...common, id: `${cue.id}-${String(i).padStart(2, "0")}`, sound: "key", stem: "ui", atMs: t, durMs: durMsOf(buffer), audible,
            tolMs: 1, text: cue.text[i], group: cue.id, buffer, gain: common.gain * fromDb(PEAK_DB.key),
          });
        });
        break;
      }
      case "key": {
        const buffer = synth.key(cue.variant, seed(cue.id));
        placed.push({ ...common, sound: `key.${cue.variant}`, stem: "ui", durMs: durMsOf(buffer), tolMs: 1, buffer, gain: common.gain * fromDb(PEAK_DB.key + (cue.variant === "down" ? 6 : 3)) });
        break;
      }
      case "tick": {
        const buffer = synth.tick(cue.variant, seed(cue.id));
        placed.push({ ...common, sound: `tick.${cue.variant}`, stem: "ui", durMs: durMsOf(buffer), tolMs: 1, buffer, gain: common.gain * fromDb(PEAK_DB.tick) });
        break;
      }
      case "click": {
        const buffer = synth.click(cue.variant, seed(cue.id));
        placed.push({ ...common, sound: `click.${cue.variant}`, stem: "ui", durMs: durMsOf(buffer), tolMs: 1, buffer, gain: common.gain * fromDb(PEAK_DB.click) });
        break;
      }
      case "chime": {
        const buffer = synth.chime();
        placed.push({ ...common, sound: "chime", stem: "ui", durMs: durMsOf(buffer), tolMs: 2, buffer, gain: common.gain * fromDb(PEAK_DB.chime) });
        break;
      }
      case "thud": {
        const buffer = synth.thud();
        placed.push({ ...common, sound: "thud", stem: "ui", durMs: durMsOf(buffer), tolMs: 2, buffer, gain: common.gain * fromDb(PEAK_DB.thud) });
        break;
      }
      case "line": {
        const buffer = synth.line(cue.durMs);
        placed.push({ ...common, sound: `line.${cue.durMs}`, stem: "ui", durMs: durMsOf(buffer), tolMs: 12, buffer, gain: common.gain * fromDb(PEAK_DB.line) });
        break;
      }
      case "whoosh": {
        const buffer = synth.whoosh(cue.durMs, cue.fromHz, cue.toHz, cue.direction, seed(cue.id));
        placed.push({ ...common, sound: `whoosh.${cue.direction}`, stem: "ui", durMs: durMsOf(buffer), tolMs: 40, buffer, gain: common.gain * fromDb(PEAK_DB.whoosh) });
        break;
      }
      case "voice":
        placed.push({ ...common, sound: `voice.${cue.voice}`, stem: "voice", durMs: 0, tolMs: 10, text: cue.text, gain: common.gain * fromDb(PEAK_DB.voice) });
        break;
    }
  }
  return placed;
};

const add = (dst: Stereo, src: Stereo, at: number, gain: number): void => {
  if (at < 0 || at + src.l.length > dst.l.length) throw new Error(`a sound starting at sample ${at} (${msAt(at)} ms) and ${src.l.length} long does not fit in ${dst.l.length}`);
  for (let i = 0; i < src.l.length; i++) {
    dst.l[at + i]! += src.l[i]! * gain;
    dst.r[at + i]! += src.r[i]! * gain;
  }
};

const frameRms = (x: Float32Array, hop: number): number[] => {
  const out: number[] = [];
  for (let s = 0; s + hop <= x.length; s += hop) {
    let e = 0;
    for (let i = s; i < s + hop; i++) e += x[i]! * x[i]!;
    out.push(Math.sqrt(e / hop));
  }
  return out;
};

export const prepareVoice = async (file: string): Promise<{ clip: Stereo; onset: number }> => {
  const x = await decodeMono(file);
  const hop = samplesAt(2);
  const rms = frameRms(x, hop);
  const top = Math.max(...rms);
  const first = rms.findIndex((v) => v > top * fromDb(-35));
  let lastFrame = rms.length - 1;
  while (lastFrame > 0 && rms[lastFrame]! < top * fromDb(-45)) lastFrame--;
  if (first < 0) throw new Error(`${file} holds no speech`);
  const onset = first * hop;
  const from = Math.max(0, onset - VOICE_PREROLL);
  const to = Math.min(x.length, (lastFrame + 1) * hop + samplesAt(60));
  const mono = new Float32Array(VOICE_PREROLL + (to - onset));
  mono.set(x.subarray(onset, to), VOICE_PREROLL);
  mono.set(x.subarray(from, onset), VOICE_PREROLL - (onset - from));
  fadeEdges(mono, VOICE_PREROLL, samplesAt(40));
  let p = 0;
  for (const v of mono) p = Math.max(p, Math.abs(v));
  const clip = blank(mono.length);
  for (let i = 0; i < mono.length; i++) clip.l[i] = clip.r[i] = mono[i]! / p;
  return { clip, onset: VOICE_PREROLL };
};

const fitBed = (src: Stereo, startMs: number, total: number, fadeInMs: number, fadeOutMs: number): Stereo => {
  const out = blank(total);
  const start = samplesAt(startMs);
  const xfade = samplesAt(2000);
  let written = 0;
  let from = start;
  while (written < total) {
    const take = Math.min(src.l.length - from, total - written);
    for (let i = 0; i < take; i++) {
      const w = written > 0 && i < xfade ? 0.5 - 0.5 * Math.cos((Math.PI * i) / xfade) : 1;
      out.l[written + i]! = out.l[written + i]! * (1 - w) + src.l[from + i]! * w;
      out.r[written + i]! = out.r[written + i]! * (1 - w) + src.r[from + i]! * w;
    }
    written += take;
    if (written < total) {
      if (src.l.length - start <= 2 * xfade) throw new Error("the bed source is too short to loop");
      written -= xfade;
      from = start;
    }
  }
  fadeEdges(out.l, samplesAt(fadeInMs), samplesAt(fadeOutMs));
  fadeEdges(out.r, samplesAt(fadeInMs), samplesAt(fadeOutMs));
  return out;
};

type Duck = { from: number; to: number; depthDb: number; attackMs: number; releaseMs: number };

const duckCurve = (total: number, ducks: Duck[]): Float32Array => {
  const g = new Float32Array(total).fill(1);
  for (const d of ducks) {
    const a = samplesAt(d.attackMs);
    const r = samplesAt(d.releaseMs);
    const depth = fromDb(d.depthDb);
    for (let i = Math.max(0, d.from - a); i < Math.min(total, d.to + r); i++) {
      const k = i < d.from ? (i - (d.from - a)) / a : i <= d.to ? 1 : 1 - (i - d.to) / r;
      const smooth = k * k * (3 - 2 * k);
      g[i] = Math.min(g[i]!, 1 - (1 - depth) * smooth);
    }
  }
  return g;
};

const findSource = async (dir: string, stem: string): Promise<string | undefined> => {
  const files = await readdir(dir).catch(() => [] as string[]);
  const hit = files.find((f) => f.startsWith(`${stem}.`) && !f.endsWith(".json"));
  return hit && join(dir, hit);
};

export type Built = {
  film: FilmSpec;
  placed: Placed[];
  stems: Record<"music" | "ui" | "voice", Stereo>;
  hasBed: boolean;
};

export const compose = async (name: FilmName, bed: boolean, take?: number): Promise<Built> => {
  const film = FILMS[name];
  const total = samplesAt(film.durationMs);
  const sources = join(ROOT, name, "sources");
  const placed = expand(film);
  const ids = new Set<string>();
  for (const p of placed) {
    if (ids.has(p.id)) throw new Error(`duplicate cue id ${p.id}`);
    ids.add(p.id);
    if (p.atMs < 0 || p.atMs >= film.durationMs) throw new Error(`cue ${p.id} at ${p.atMs} ms is outside 0..${film.durationMs}`);
  }

  const ui = blank(total);
  const voice = blank(total);
  const ducks: Duck[] = [];

  for (const p of placed) {
    const at = samplesAt(p.atMs);
    if (p.stem === "voice") {
      const file = await findSource(sources, `voice-${p.id}`);
      if (!file && !bed) continue;
      if (!file) throw new Error(`no voice source for ${p.id}; run generate-voice ${name}`);
      const { clip, onset } = await prepareVoice(file);
      add(voice, clip, at - onset, p.gain);
      p.durMs = msAt(clip.l.length - onset);
      ducks.push({ from: at - samplesAt(150), to: at + samplesAt(p.durMs) + samplesAt(200), depthDb: -5.5, attackMs: 140, releaseMs: 520 });
    } else if (p.buffer && p.audible) {
      add(ui, p.buffer, at, p.gain);
      if (p.sound === "chime") ducks.push({ from: at, to: at + samplesAt(500), depthDb: -2.5, attackMs: 40, releaseMs: 600 });
      if (p.sound === "thud") ducks.push({ from: at, to: at + samplesAt(300), depthDb: -2, attackMs: 30, releaseMs: 500 });
    }
  }

  const wet = synth.room(ui);
  for (let i = 0; i < total; i++) {
    ui.l[i]! += wet.l[i]! * 0.32;
    ui.r[i]! += wet.r[i]! * 0.32;
  }

  const music = blank(total);
  const bedFile = bed ? await findSource(sources, `music.take${take ?? film.music.take}`) : undefined;
  if (bed && !bedFile) throw new Error(`no music source for ${name}; run generate-music ${name}`);
  if (bedFile) {
    const fitted = fitBed(await decode(bedFile), film.music.startMs, total, film.music.fadeInMs, film.music.fadeOutMs);
    const curve = duckCurve(total, ducks);
    const g = fromDb(film.music.gainDb);
    for (let i = 0; i < total; i++) {
      music.l[i] = fitted.l[i]! * curve[i]! * g;
      music.r[i] = fitted.r[i]! * curve[i]! * g;
    }
  }
  return { film, placed, stems: { music, ui, voice }, hasBed: Boolean(bedFile) };
};

const scaled = (s: Stereo, gain: number): Stereo => {
  const out = blank(s.l.length);
  for (let i = 0; i < s.l.length; i++) {
    out.l[i] = s.l[i]! * gain;
    out.r[i] = s.r[i]! * gain;
  }
  return out;
};

const mixOf = (stems: Built["stems"], bedGain: number): Stereo => {
  const n = stems.ui.l.length;
  const out = blank(n);
  for (let i = 0; i < n; i++) {
    out.l[i] = stems.music.l[i]! * bedGain + stems.ui.l[i]! + stems.voice.l[i]!;
    out.r[i] = stems.music.r[i]! * bedGain + stems.ui.r[i]! + stems.voice.r[i]!;
  }
  return out;
};

// Cue and voice levels are absolute, so the bed is the one stem that moves to land the mix on the target.
export const master = async (built: Built, work: string): Promise<{ bedGain: number; loudness: Loudness }> => {
  const probe = join(work, "pre-master.wav");
  await writeWav24(probe, scaled(built.stems.music, 1));
  const alone = await measure(probe);
  let db = TARGET_LUFS - alone.integrated - 1;
  let previous: { db: number; integrated: number } | undefined;
  let loudness: Loudness = alone;
  for (let pass = 0; pass < 10; pass++) {
    await writeWav24(probe, mixOf(built.stems, fromDb(db)));
    loudness = await measure(probe);
    const error = TARGET_LUFS - loudness.integrated;
    if (Math.abs(error) < 0.02) break;
    const slope = previous && Math.abs(db - previous.db) > 1e-6 ? (loudness.integrated - previous.integrated) / (db - previous.db) : 1;
    previous = { db, integrated: loudness.integrated };
    db += error / Math.min(1.2, Math.max(0.3, slope));
  }
  return { bedGain: fromDb(db), loudness };
};

const writeAll = async (name: FilmName, built: Built, out: string, work: string): Promise<{ bedGain: number; loudness: Loudness }> => {
  await mkdir(join(out, "stems"), { recursive: true });
  await mkdir(work, { recursive: true });
  const { bedGain, loudness } = built.hasBed ? await master(built, work) : { bedGain: 1, loudness: { integrated: 0, truePeak: 0, range: 0 } };
  if (built.hasBed && loudness.truePeak > MAX_TRUE_PEAK) {
    const peaks = Object.entries(built.stems).map(([k, v]) => `${k} ${toDb(peakOf(k === "music" ? scaled(v, bedGain) : v)).toFixed(2)} dBFS`).join(", ");
    throw new Error(`${name} reaches ${loudness.truePeak} dBTP at ${TARGET_LUFS} LUFS (limit ${MAX_TRUE_PEAK}); stem sample peaks: ${peaks}. Lower the loudest cue level in build.ts.`);
  }
  await writeWav24(join(out, "mix.wav"), mixOf(built.stems, bedGain));
  for (const stem of ["music", "ui", "voice"] as const) {
    if (stem === "voice" && !built.placed.some((p) => p.stem === "voice")) continue;
    if (stem === "music" && !built.hasBed) continue;
    const wav = join(work, `${stem}.wav`);
    await writeWav24(wav, stem === "music" ? scaled(built.stems.music, bedGain) : built.stems[stem]);
    await encodeFlac(wav, join(out, "stems", `${stem}.flac`));
  }
  return { bedGain, loudness };
};

const cuesJson = (name: FilmName, built: Built, bedGain: number, loudness: Loudness): unknown => ({
  film: name,
  durationMs: built.film.durationMs,
  durationSamples: samplesAt(built.film.durationMs),
  sampleRate: SAMPLE_RATE,
  sheet: "brief section 9, Sidecar retimed per direction.md section 8",
  mix: { file: "mix.wav", targetLufs: TARGET_LUFS, bedGainDb: Number(toDb(bedGain).toFixed(3)), integratedLufs: loudness.integrated, truePeakDbtp: loudness.truePeak },
  cues: built.placed.map((p) => ({
    id: p.id,
    sound: p.sound,
    stem: p.stem,
    atMs: p.atMs,
    atSample: samplesAt(p.atMs),
    durMs: Math.round(p.durMs),
    audible: p.audible,
    onsetTolMs: p.tolMs,
    sheet: p.sheet,
    marks: p.marks,
    ...(p.text && { text: p.text }),
    ...(p.group && { group: p.group }),
  })),
  typing: built.film.cues
    .filter((c): c is Extract<CueSpec, { sound: "typing" }> => c.sound === "typing")
    .map((c) => ({ id: c.id, text: c.text, startMs: c.at, endMs: c.endMs, presses: pressTimes(c.at, c.endMs, c.text, hash(`${name}/${c.id}`)) })),
});

const main = async (): Promise<void> => {
  const [name, ...flags] = process.argv.slice(2);
  if (!name || !(name in FILMS)) throw new Error(`usage: build.ts <${Object.keys(FILMS).join("|")}> [--dry]`);
  const film = name as FilmName;
  const dry = flags.includes("--dry");
  const take = flags.includes("--take") ? Number(flags[flags.indexOf("--take") + 1]) : undefined;
  const built = await compose(film, !dry, take);
  const out = dry ? join(ROOT, "_work", "dry", film) : join(ROOT, film);
  const work = join(ROOT, "_work", film);
  const { bedGain, loudness } = await writeAll(film, built, out, work);
  await writeJson(join(out, "cues.json"), cuesJson(film, built, bedGain, loudness));
  const mix = await readFile(join(out, "mix.wav"));
  console.log(`${film}: bed gain ${toDb(bedGain).toFixed(2)} dB, ${loudness.integrated} LUFS, ${loudness.truePeak} dBTP, sha256 ${createHash("sha256").update(mix).digest("hex").slice(0, 16)}`);
};

if (import.meta.main) await main();
