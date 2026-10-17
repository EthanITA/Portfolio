import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { SAGE_SCRIPT } from "../../../app/utils/play/script/sage";
import { MAX_TRUE_PEAK, ROOT, TARGET_LUFS, compose, rawBed } from "./build";
import { FILMS, type FilmName } from "./films";
import { SAMPLE_RATE, type Stereo, blank, decode, durationOf, measure, run, samplesAt, toDb } from "./lib/audio";
import type { BedPlan } from "./lib/bed";
import { biquad } from "./lib/dsp";
import { room } from "./lib/synth";

type CueRow = { id: string; sound: string; stem: "ui" | "voice"; atMs: number; durMs: number; audible: boolean; onsetTolMs: number; text?: string };
type DuckRow = { reason: string; fromMs: number; toMs: number; depthDb: number; attackMs: number; releaseMs: number };
type CuesFile = { durationMs: number; durationSamples: number; mix: { bedGainDb: number }; cues: CueRow[]; ducks: DuckRow[]; bed?: BedPlan };

const COPY = "/Users/madong/.claude/jobs/e4337bca/tmp/site/copy.md";
const MATCH_SAMPLES = 4800;
const STEM_LAG_SAMPLES = 3;
const MATCH_RANGE = 1200;
const MIX_BAND_HZ = 1200;
const ROOM_WET = 0.32;
const ROOM_TAIL_SAMPLES = samplesAt(1500);
const AUDIBLE_IN_MIX = /^(tick|click|chime|voice)/;
let failures = 0;

const report = (ok: boolean, what: string, detail: string): void => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}: ${detail}`);
};

const envelope = (x: Float32Array): Float64Array => {
  const hop = SAMPLE_RATE / 1000;
  const out = new Float64Array(Math.floor(x.length / hop));
  for (let k = 0; k < out.length; k++) {
    let e = 0;
    for (let i = k * hop; i < (k + 1) * hop; i++) e += x[i]! * x[i]!;
    out[k] = 10 * Math.log10(e / hop + 1e-12);
  }
  return out;
};

const biggestJump = (env: Float64Array, fromMs: number, toMs: number): number => {
  let best = { ms: fromMs, jump: -Infinity };
  for (let k = Math.max(1, Math.floor(fromMs)); k <= Math.min(env.length - 1, Math.ceil(toMs)); k++) {
    const jump = env[k]! - env[k - 1]!;
    if (jump > best.jump) best = { ms: k, jump };
  }
  return best.ms;
};

const firstNearPeak = (env: Float64Array, fromMs: number, toMs: number, belowPeakDb: number): number => {
  let peak = -Infinity;
  for (let k = Math.max(0, Math.floor(fromMs)); k < Math.min(env.length, Math.ceil(toMs)); k++) peak = Math.max(peak, env[k]!);
  for (let k = Math.max(0, Math.floor(fromMs)); k < env.length; k++) if (env[k]! >= peak - belowPeakDb) return k;
  return -1;
};

const match = (m: Float32Array, t: Float32Array, at: number): { lag: number; ratio: number; ncc: number } => {
  let tt = 0;
  for (const v of t) tt += v * v;
  const base = at - MATCH_RANGE;
  const prefix = new Float64Array(2 * MATCH_RANGE + t.length + 1);
  for (let i = 0; i < prefix.length - 1; i++) prefix[i + 1] = prefix[i]! + m[base + i]! * m[base + i]!;
  let best = { lag: 0, s: 0, ncc: -Infinity };
  for (let lag = -MATCH_RANGE; lag <= MATCH_RANGE; lag++) {
    let s = 0;
    for (let j = 0; j < t.length; j++) s += t[j]! * m[at + lag + j]!;
    const k = lag + MATCH_RANGE;
    const ncc = s / Math.sqrt(tt * (prefix[k + t.length]! - prefix[k]!) + 1e-30);
    if (ncc > best.ncc) best = { lag, s, ncc };
  }
  return { lag: best.lag, ratio: best.s / (tt + 1e-30), ncc: best.ncc };
};

const mono = (s: Stereo): Float32Array => {
  const m = new Float32Array(s.l.length);
  for (let i = 0; i < m.length; i++) m[i] = (s.l[i]! + s.r[i]!) / 2;
  return m;
};

const rmsDb = (x: Float32Array, from: number, to: number): number => {
  let e = 0;
  for (let i = from; i < to; i++) e += x[i]! * x[i]!;
  return 10 * Math.log10(e / Math.max(1, to - from) + 1e-15);
};

const walk = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
};

const verifyFilm = async (name: FilmName, rebuild: boolean): Promise<void> => {
  const dir = join(ROOT, name);
  const cues = JSON.parse(await readFile(join(dir, "cues.json"), "utf8")) as CuesFile;
  const spec = FILMS[name];
  console.log(`\n== ${name} (${spec.durationMs} ms)`);

  const files = ["mix.wav", ...(await readdir(join(dir, "stems"))).map((f) => join("stems", f))];
  for (const f of files) {
    const ms = await durationOf(join(dir, f));
    report(Math.abs(ms - spec.durationMs) <= 10, `duration ${f}`, `${ms.toFixed(3)} ms vs ${spec.durationMs} ms`);
  }

  const mix = await decode(join(dir, "mix.wav"));
  report(mix.l.length === cues.durationSamples, "mix sample count", `${mix.l.length} vs ${cues.durationSamples}`);
  let peak = 0;
  let hot = 0;
  for (let i = 0; i < mix.l.length; i++) {
    const a = Math.max(Math.abs(mix.l[i]!), Math.abs(mix.r[i]!));
    peak = Math.max(peak, a);
    if (a >= 0.999) hot++;
  }
  report(hot === 0 && peak < 1, "no clipping", `sample peak ${toDb(peak).toFixed(2)} dBFS, ${hot} samples at full scale`);
  const loud = await measure(join(dir, "mix.wav"));
  report(Math.abs(loud.integrated - TARGET_LUFS) <= 0.5, "integrated loudness", `${loud.integrated} LUFS (target ${TARGET_LUFS} +-0.5), loudness range ${loud.range} LU`);
  report(loud.truePeak <= MAX_TRUE_PEAK && loud.truePeak < -1, "true peak", `${loud.truePeak} dBTP (limit -1)`);
  report(mix.l[0] === 0 && mix.r[0] === 0 && mix.l.at(-1) === 0 && mix.r.at(-1) === 0, "starts and ends on digital zero", `first ${mix.l[0]}, last ${mix.l.at(-1)}`);

  const stemNames = (await readdir(join(dir, "stems"))).map((f) => f.replace(".flac", ""));
  const stems: Record<string, Stereo> = {};
  for (const s of stemNames) stems[s] = await decode(join(dir, "stems", `${s}.flac`));
  let worst = 0;
  for (let i = 0; i < mix.l.length; i++) {
    let l = 0;
    let r = 0;
    for (const s of Object.values(stems)) {
      l += s.l[i]!;
      r += s.r[i]!;
    }
    worst = Math.max(worst, Math.abs(l - mix.l[i]!), Math.abs(r - mix.r[i]!));
  }
  report(worst * 8388607 <= 4, "stems sum to the mix", `largest difference ${(worst * 8388607).toFixed(2)} LSB of 24-bit`);

  const built = await compose(name, false);
  const byId = new Map(built.placed.map((p) => [p.id, p]));
  const ui = mono(stems.ui!);
  const uiEnv = envelope(ui);
  const voice = stems.voice ? mono(stems.voice) : new Float32Array(mix.l.length);
  const voiceEnv = stems.voice ? envelope(voice) : new Float64Array();
  const audible = cues.cues.filter((c) => c.audible);

  const withRoom = (dryStereo: Stereo): Float32Array => {
    const wet = room(dryStereo);
    const out = new Float32Array(dryStereo.l.length);
    for (let i = 0; i < out.length; i++) out[i] = (dryStereo.l[i]! + dryStereo.r[i]! + ROOM_WET * (wet.l[i]! + wet.r[i]!)) / 2;
    return out;
  };

  const dry = new Map<string, Float32Array>();
  const heard = new Map<string, Float32Array>();
  const everything = blank(ui.length);
  for (const c of audible.filter((x) => x.stem === "ui")) {
    const p = byId.get(c.id);
    if (!p?.buffer) continue;
    const own = blank(p.buffer.l.length + ROOM_TAIL_SAMPLES);
    const at = samplesAt(c.atMs);
    for (let i = 0; i < p.buffer.l.length; i++) {
      own.l[i] = p.buffer.l[i]! * p.gain;
      own.r[i] = p.buffer.r[i]! * p.gain;
      everything.l[at + i]! += own.l[i]!;
      everything.r[at + i]! += own.r[i]!;
    }
    dry.set(c.id, mono(own).subarray(0, p.buffer.l.length));
    heard.set(c.id, withRoom(own));
  }
  const expected = withRoom(everything);

  // Taking every other declared cue, reverb included, out of the stem lets overlapping cues be judged alone.
  const alone = (c: CueRow, length: number): { local: Float32Array; at: number } => {
    const at = samplesAt(c.atMs);
    const from = Math.max(0, Math.floor((at - MATCH_RANGE - SAMPLE_RATE / 10) / 48) * 48);
    const to = Math.min(ui.length, at + length + MATCH_RANGE + 1);
    const local = new Float32Array(to - from);
    const own = heard.get(c.id);
    for (let i = 0; i < local.length; i++) local[i] = ui[from + i]! - expected[from + i]!;
    if (own) for (let i = 0; i < own.length && at - from + i < local.length; i++) local[at - from + i]! += own[i]!;
    return { local, at: at - from };
  };

  let bad = 0;
  let checked = 0;
  let skipped = 0;
  const energyMisses: string[] = [];
  for (const c of audible) {
    const swell = c.sound.startsWith("line");
    if (c.sound.startsWith("whoosh")) {
      skipped++;
      continue;
    }
    let found: number;
    if (c.stem === "ui") {
      const { local, at } = alone(c, swell ? c.durMs * 48 : MATCH_SAMPLES);
      const env = envelope(local);
      const start = at / 48;
      found = (swell ? firstNearPeak(env, start - 25, start + c.durMs, 40) : biggestJump(env, start - 25, start + c.onsetTolMs + 25)) - start + c.atMs;
    } else {
      found = biggestJump(voiceEnv, c.atMs - 25, c.atMs + c.onsetTolMs + 25);
    }
    checked++;
    if (Math.abs(found - c.atMs) > c.onsetTolMs + 1) {
      bad++;
      energyMisses.push(`  ${c.id} wanted ${c.atMs} ms, energy rises at ${found} ms`);
    }
  }
  report(bad === 0, "cue onsets by energy with the other cues taken out", `${checked - bad} of ${checked} within tolerance, ${skipped} whooshes are proven by the waveform match below`);
  energyMisses.forEach((l) => console.log(l));

  const uiMisses: string[] = [];
  let uiChecked = 0;
  for (const c of audible.filter((x) => x.stem === "ui")) {
    const own = dry.get(c.id);
    if (!own) continue;
    const t = own.subarray(0, c.sound.startsWith("line") ? SAMPLE_RATE : MATCH_SAMPLES);
    const { local, at } = alone(c, t.length);
    const m = match(local, t, at);
    uiChecked++;
    if (Math.abs(m.lag) > STEM_LAG_SAMPLES || m.ratio < 0.8 || m.ratio > 1.25) uiMisses.push(`  ${c.id} lag ${m.lag} samples, level ratio ${m.ratio.toFixed(2)}`);
  }
  report(uiMisses.length === 0, "ui cue waveforms sit at their time in ui.flac", `${uiChecked - uiMisses.length} of ${uiChecked} within ${STEM_LAG_SAMPLES} samples (${((STEM_LAG_SAMPLES * 1000) / SAMPLE_RATE).toFixed(2)} ms) with the expected level`);
  uiMisses.forEach((l) => console.log(l));

  const highpass = biquad("highpass", MIX_BAND_HZ);
  const mixHigh = mono(mix).map((v) => highpass(v));
  const mixMisses: string[] = [];
  const quiet: string[] = [];
  let mixChecked = 0;
  let worstLag = 0;
  let weakest = Infinity;
  for (const c of audible.filter((x) => !x.sound.startsWith("thud"))) {
    const p = byId.get(c.id);
    const f = biquad("highpass", MIX_BAND_HZ);
    const at = samplesAt(c.atMs);
    const source = p?.buffer ? mono(p.buffer).map((v) => v * p.gain) : voice.slice(at, at + MATCH_SAMPLES);
    const m = match(mixHigh, source.map((v) => f(v)).subarray(0, MATCH_SAMPLES), at);
    if (!AUDIBLE_IN_MIX.test(c.sound)) {
      if (Math.abs(m.lag) > 2 || m.ncc < 0.1) quiet.push(c.id);
      continue;
    }
    mixChecked++;
    worstLag = Math.max(worstLag, Math.abs(m.lag));
    weakest = Math.min(weakest, m.ncc);
    if (Math.abs(m.lag) > 2 || m.ncc < 0.1) mixMisses.push(`  ${c.id} lag ${m.lag} samples, correlation ${m.ncc.toFixed(2)}`);
  }
  report(mixMisses.length === 0, `ticks, clicks, chimes and voice found in mix.wav alone above ${MIX_BAND_HZ} Hz`, `${mixChecked - mixMisses.length} of ${mixChecked} within 2 samples (worst lag ${worstLag}, weakest correlation ${weakest.toFixed(2)})`);
  mixMisses.forEach((l) => console.log(l));
  if (quiet.length) console.log(`NOTE ${quiet.length} keys, whooshes and lines are proven in the stems only, the bed covers them in the mix (first ones: ${quiet.slice(0, 4).join(", ")})`);

  const busy: Array<[number, number]> = audible.map((c) => [samplesAt(c.atMs) - samplesAt(10), samplesAt(c.atMs + c.durMs + 900)]);
  busy.sort((a, b) => a[0] - b[0]);
  const gaps: Array<[number, number]> = [];
  let cursor = 0;
  for (const [a, b] of busy) {
    if (a - cursor > samplesAt(300)) gaps.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < mix.l.length - samplesAt(300)) gaps.push([cursor, mix.l.length]);
  const loudestGap = Math.max(...gaps.map(([a, b]) => Math.max(rmsDb(ui, a, b), rmsDb(voice, a, b))));
  report(loudestGap <= -80, "silence outside cues", `${gaps.length} gaps, loudest cue-stem level in them ${loudestGap.toFixed(1)} dBFS`);

  if (stems.music) {
    const level = rmsDb(mono(stems.music), samplesAt(3000), samplesAt(spec.durationMs - 5000));
    report(level > -45, "bed is present under the film", `${level.toFixed(1)} dBFS rms between 3 s and the last 5 s`);

    const bed = mono(await rawBed(name));
    const music = mono(stems.music);

    if (cues.bed) {
      const { closeMs } = cues.bed;
      const endCard = cues.cues.find((c) => c.id === "line-end-card");
      const early = endCard ? endCard.atMs - closeMs : Number.NaN;
      report(early > 0 && early <= 1000, "the closing hit lands just before the end-card line", `closing hit at ${closeMs} ms, line at ${endCard?.atMs} ms`);
      const frame = samplesAt(5);
      let loudest = { ms: 0, db: -Infinity };
      for (let ms = closeMs - 150; ms <= closeMs + 150; ms += 5) {
        const db = rmsDb(bed, samplesAt(ms), samplesAt(ms) + frame);
        if (db > loudest.db) loudest = { ms, db };
      }
      report(loudest.ms >= closeMs && loudest.ms <= closeMs + 60, "the loudest bed moment around the close is the closing hit", `peak window at ${loudest.ms} ms, close at ${closeMs} ms`);
    }
    const gainDb = cues.mix.bedGainDb;
    const hop = samplesAt(20);
    const ratioAt = (ms: number): number => rmsDb(music, samplesAt(ms), samplesAt(ms) + hop) - rmsDb(bed, samplesAt(ms), samplesAt(ms) + hop) - gainDb;
    const touched = (ms: number): boolean => cues.ducks.some((d) => ms >= d.fromMs - d.attackMs - 20 && ms <= d.toMs + d.releaseMs);
    let untouchedWorst = 0;
    for (let ms = 0; ms + 20 <= spec.durationMs; ms += 20) if (!touched(ms) && rmsDb(bed, samplesAt(ms), samplesAt(ms) + hop) > -90) untouchedWorst = Math.max(untouchedWorst, Math.abs(ratioAt(ms)));
    report(untouchedWorst <= 0.1, "the bed is untouched away from the ducks", `largest change ${untouchedWorst.toFixed(3)} dB over every 20 ms window outside ${cues.ducks.length} ducks`);

    const voiceDucks = cues.ducks.filter((d) => d.reason.startsWith("voice "));
    const shallow: string[] = [];
    for (const d of voiceDucks) {
      let worst = -Infinity;
      for (let ms = Math.ceil(d.fromMs / 20) * 20 + 20; ms + 40 <= d.toMs; ms += 20) if (rmsDb(bed, samplesAt(ms), samplesAt(ms) + hop) > -90) worst = Math.max(worst, ratioAt(ms));
      if (worst > Math.min(-6, d.depthDb) + 0.5) shallow.push(`  ${d.reason} bed only ${worst.toFixed(1)} dB down, recorded ${d.depthDb} dB`);
    }
    report(
      voiceDucks.every((d) => d.depthDb <= -6 && d.attackMs === 120 && d.releaseMs === 400) && shallow.length === 0,
      "the bed sits at least 6 dB down under every voice line",
      voiceDucks.length ? voiceDucks.map((d) => `${d.reason} ${d.depthDb} dB`).join(", ") : "no voice in this film",
    );
    shallow.forEach((l) => console.log(l));
  }

  const copy = await readFile(COPY, "utf8");
  const spoken = cues.cues.filter((c) => c.stem === "voice");
  report(spoken.every((c) => c.text && copy.includes(c.text)), "voiced strings are copy.md strings", spoken.length ? spoken.map((c) => `"${c.text}"`).join(", ") : "no voice in this film");

  if (name === "sage") {
    const misfits = SAGE_SCRIPT.voice.flatMap((window) => {
      const cue = spoken.find((c) => c.text === window.line);
      if (!cue) return [`  no voice cue says "${window.line}"`];
      const end = cue.atMs + cue.durMs;
      return cue.atMs === window.at && end <= window.until ? [] : [`  "${window.line}" runs ${cue.atMs} to ${end} ms and play gives it ${window.at} to ${window.until} ms`];
    });
    report(misfits.length === 0, "each voice line fits the window play gives it", SAGE_SCRIPT.voice.map((w) => `"${w.line}" ${w.at} to ${w.until}`).join(", "));
    misfits.forEach((l) => console.log(l));
  }

  if (rebuild) {
    const before = createHash("sha256").update(await readFile(join(dir, "mix.wav"))).digest("hex");
    await run("/usr/bin/env", ["pnpm", "tsx", join(ROOT, "scripts", "build.ts"), name]);
    const after = createHash("sha256").update(await readFile(join(dir, "mix.wav"))).digest("hex");
    report(before === after, "rebuild is bit-identical", `${before.slice(0, 16)} then ${after.slice(0, 16)}`);
  }
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith("--"));
  const arg = args.find((a) => !a.startsWith("--"));
  const names = (arg && arg in FILMS ? [arg] : Object.keys(FILMS)) as FilmName[];
  for (const n of names) await verifyFilm(n, flags.includes("--rebuild"));

  const key = process.env.OPENROUTER_API_KEY;
  if (key) {
    let leaks = 0;
    for (const f of await walk(ROOT)) if ((await stat(f)).size < 40_000_000 && (await readFile(f)).includes(key)) leaks++;
    report(leaks === 0, "no file under films/audio holds the API key", `${leaks} files match`);
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exitCode = failures ? 1 : 0;
};

await main();
