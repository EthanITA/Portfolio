import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { MAX_TRUE_PEAK, ROOT, TARGET_LUFS, compose, rawBed } from "./build";
import { FILMS, type FilmName, spokenForm } from "./films";
import { SAMPLE_RATE, type Stereo, blank, decode, durationOf, measure, run, samplesAt, toDb } from "./lib/audio";
import type { BedPlan } from "./lib/bed";
import { biquad } from "./lib/dsp";
import { room } from "./lib/synth";
import { BREATH_MS, SAGE_CLEAR_MS } from "./sheets";
import { type Word, anchorOf } from "./lib/words";

type CueRow = {
  id: string; sound: string; stem: "ui" | "voice"; atMs: number; durMs: number; audible: boolean; onsetTolMs: number;
  text?: string; voice?: string; fromMs?: number; untilMs?: number; words?: Word[]; anchor?: { word: string; beatMs: number };
};

const CLOSE_TOLERANCE_MS = 20;
const SHARED_BEAT_MS = 30;
const ANCHOR_WINDOW_MS = 30;
const WHOOSHES: Record<FilmName, Record<string, number>> = { shell: { islandOpen: 500 }, sage: { islandOpen: 500 }, sidecar: { islandOpen: 500, noteArc: 1000 } };
type DuckRow = { reason: string; fromMs: number; toMs: number; depthDb: number; attackMs: number; releaseMs: number };
type CuesFile = { durationMs: number; durationSamples: number; mixSha256: string; mix: { bedGainDb: number }; cues: CueRow[]; ducks: DuckRow[]; bed: BedPlan };

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
  const first = Math.max(-MATCH_RANGE, -at);
  const last = Math.min(MATCH_RANGE, m.length - at - t.length);
  const base = at + first;
  const prefix = new Float64Array(last - first + t.length + 1);
  for (let i = 0; i < prefix.length - 1; i++) prefix[i + 1] = prefix[i]! + m[base + i]! * m[base + i]!;
  let best = { lag: 0, s: 0, ncc: -Infinity };
  for (let lag = first; lag <= last; lag++) {
    let s = 0;
    for (let j = 0; j < t.length; j++) s += t[j]! * m[at + lag + j]!;
    const k = lag - first;
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
  const highpassNoVoice = biquad("highpass", MIX_BAND_HZ);
  const mixNoVoiceHigh = mono(mix).map((v, i) => highpassNoVoice(v - voice[i]!));
  const mixMisses: string[] = [];
  const quiet: string[] = [];
  const shared: string[] = [];
  let mixChecked = 0;
  let worstLag = 0;
  let weakest = Infinity;
  for (const c of audible.filter((x) => !x.sound.startsWith("thud"))) {
    if (c.stem === "ui" && cues.bed.accents.some((a) => a.kind !== "clap" && Math.abs(a.atMs - c.atMs) <= SHARED_BEAT_MS)) {
      shared.push(c.id);
      continue;
    }
    const p = byId.get(c.id);
    const f = biquad("highpass", MIX_BAND_HZ);
    const at = samplesAt(c.atMs);
    const source = p?.buffer ? mono(p.buffer).map((v) => v * p.gain) : voice.slice(at, at + MATCH_SAMPLES);
    const m = match(p?.buffer ? mixNoVoiceHigh : mixHigh, source.map((v) => f(v)).subarray(0, MATCH_SAMPLES), at);
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
  if (shared.length) console.log(`NOTE ${shared.length} cues share a beat with a bed stab or the closing hit, so only the stems prove them (${shared.join(", ")})`);

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

    const { grid, closeMs, breakdown, sections, accents } = cues.bed;
    const endCard = cues.cues.find((c) => c.id === "line-end-card");
    const apart = endCard ? Math.abs(endCard.atMs - closeMs) : Number.NaN;
    report(apart <= CLOSE_TOLERANCE_MS, `the closing hit and the end-card line share a beat within ${CLOSE_TOLERANCE_MS} ms`, `closing hit at ${closeMs} ms, line at ${endCard?.atMs} ms`);
    report(
      grid.bpm === 120 && grid.beatMs === 500 && grid.barMs === 2000 && grid.originMs === 0 && grid.beats === Math.floor(spec.durationMs / grid.beatMs) && (closeMs - grid.originMs) % grid.beatMs === 0,
      "the bed is on the 120 bpm grid with the close on a beat",
      `${grid.bpm} bpm, beat ${grid.beatMs} ms, ${grid.beats} beats, close on beat ${(closeMs - grid.originMs) / grid.beatMs}`,
    );
    const closeAccent = accents.find((a) => a.kind === "close");
    report(!!closeAccent && Math.abs(closeAccent.atMs - closeMs) <= CLOSE_TOLERANCE_MS, "the accents list the close", `${accents.length} accents, close at ${closeAccent?.atMs} ms`);
    const inBreakdown = sections.filter((s) => s.atMs >= breakdown.fromMs && s.atMs < breakdown.toMs);
    report(
      inBreakdown.length > 0 && inBreakdown.every((s) => s.layers.length === 2 && s.layers.includes("kick") && s.layers.includes("bass")) && sections.every((s) => s.layers.includes("kick")),
      "the breakdown is kick and bass only and the kick never leaves the sections",
      `${breakdown.fromMs} to ${breakdown.toMs} ms, ${inBreakdown.map((s) => s.layers.join("+")).join(", ")}`,
    );

    const lowpass = biquad("lowpass", 150);
    const low = bed.map((v) => lowpass(v));
    const rise = (ms: number): number => rmsDb(low, samplesAt(ms), samplesAt(ms + 25)) - rmsDb(low, samplesAt(ms - 60), samplesAt(ms - 30));
    const beats = Array.from({ length: Math.floor(closeMs / grid.beatMs) }, (_, i) => grid.originMs + (i + 1) * grid.beatMs).filter((ms) => ms < closeMs);
    const weakest = beats.map((ms) => ({ ms, db: rise(ms) })).sort((a, b) => a.db - b.db)[0];
    report(!!weakest && weakest.db >= 3, "a kick lands on every beat before the close", `${beats.length} beats, weakest at ${weakest?.ms} ms rises ${weakest?.db.toFixed(1)} dB`);
    const after = Array.from({ length: Math.floor((spec.durationMs - closeMs) / grid.beatMs) - 1 }, (_, i) => closeMs + (i + 1) * grid.beatMs);
    const strongest = after.map((ms) => ({ ms, db: rise(ms) })).sort((a, b) => b.db - a.db)[0];
    report(!strongest || strongest.db < 3, "no drum after the close, the chord rings out", `${after.length} beats after the close, strongest rise ${strongest?.db.toFixed(1)} dB`);
    const frame = samplesAt(5);
    let loudest = { ms: 0, db: -Infinity };
    for (let ms = closeMs - 150; ms <= closeMs + 150; ms += 5) {
      const db = rmsDb(bed, samplesAt(ms), samplesAt(ms) + frame);
      if (db > loudest.db) loudest = { ms, db };
    }
    report(loudest.ms >= closeMs && loudest.ms <= closeMs + 60, "the loudest bed moment around the close is the closing hit", `peak window at ${loudest.ms} ms, close at ${closeMs} ms`);
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
      let musicEnergy = 0;
      let bedEnergy = 0;
      let worst = -Infinity;
      for (let ms = Math.ceil(d.fromMs / 20) * 20 + 20; ms + 40 <= d.toMs; ms += 20) {
        const bedDb = rmsDb(bed, samplesAt(ms), samplesAt(ms) + hop);
        if (bedDb <= -90) continue;
        musicEnergy += 10 ** (rmsDb(music, samplesAt(ms), samplesAt(ms) + hop) / 10);
        bedEnergy += 10 ** ((bedDb + gainDb) / 10);
        if (bedDb > -60) worst = Math.max(worst, ratioAt(ms));
      }
      const overall = 10 * Math.log10(musicEnergy / bedEnergy);
      const floor = Math.min(-6, d.depthDb);
      if (overall > floor + 0.5 || worst > floor + 2) shallow.push(`  ${d.reason} bed only ${overall.toFixed(1)} dB down over the line and ${worst.toFixed(1)} dB at its shallowest window, recorded ${d.depthDb} dB`);
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

  const asWritten = spoken.filter((c) => !c.words || c.words.map((w) => w.text).join(" ") !== c.text);
  report(asWritten.length === 0 && spoken.every((c) => c.words?.length), "every voice cue carries its words, and they read as the line is written", `${spoken.length} cues`);
  asWritten.forEach((c) => console.log(`  ${c.id} words read "${c.words?.map((w) => w.text).join(" ")}"`));
  const reversed = spoken.filter((c) => c.words?.some((w, i) => w.endMs < w.startMs || (i > 0 && w.startMs < c.words![i - 1]!.startMs) || w.startMs < c.atMs || w.endMs > c.atMs + c.durMs + 1));
  report(reversed.length === 0, "word times run forward and stay inside their take", `${spoken.length} cues`);
  reversed.forEach((c) => console.log(`  ${c.id} has words out of order or outside ${c.atMs} to ${Math.round(c.atMs + c.durMs)} ms`));

  const narrator = spoken.filter((c) => c.voice === "narrator");
  if (narrator.length) {
    const flat = (s: string): string => s.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();
    const misread: string[] = [];
    for (const c of narrator) {
      const source = JSON.parse(await readFile(join(dir, "sources", `voice-${c.id}.json`), "utf8")) as { transcript: string };
      if (flat(source.transcript) !== flat(spokenForm(c.text!))) misread.push(`  ${c.id} was heard as "${source.transcript}"`);
    }
    report(misread.length === 0, "each narrator take says its copy.md line with the three spoken swaps", `${narrator.length} lines`);
    misread.forEach((l) => console.log(`${l}`));

    const off = narrator.flatMap((c) => {
      if (!c.anchor || !c.words) return [`  ${c.id} has no anchor`];
      const start = anchorOf(c.words, c.anchor.word).startMs;
      const lead = c.anchor.beatMs - start;
      return lead >= 0 && lead <= ANCHOR_WINDOW_MS ? [] : [`  ${c.id} says "${c.anchor.word}" at ${start} ms, ${lead} ms before the beat at ${c.anchor.beatMs} ms`];
    });
    report(off.length === 0, `each narrator line says its anchor word 0 to ${ANCHOR_WINDOW_MS} ms before its beat`, `${narrator.length} lines, ${narrator.map((c) => `${c.anchor?.word} ${c.anchor!.beatMs - anchorOf(c.words!, c.anchor!.word).startMs}`).join(", ")}`);
    off.forEach((l) => console.log(l));

    const misfits = narrator.flatMap((c) => {
      const end = c.atMs + c.durMs;
      return c.atMs >= (c.fromMs ?? Number.NaN) && end <= (c.untilMs ?? Number.NaN) ? [] : [`  ${c.id} runs ${c.atMs} to ${Math.round(end)} ms outside ${c.fromMs} to ${c.untilMs} ms`];
    });
    report(misfits.length === 0, "each narrator take sits inside its window", `${narrator.length} lines`);
    misfits.forEach((l) => console.log(l));

    const breathless = narrator.flatMap((c, i) => {
      const next = narrator[i + 1];
      const gap = next ? next.atMs - (c.atMs + c.durMs) : Number.POSITIVE_INFINITY;
      return gap >= BREATH_MS ? [] : [`  ${c.id} ends ${Math.round(gap)} ms before ${next?.id}`];
    });
    report(breathless.length === 0, `the narrator breathes ${BREATH_MS} ms between lines`, `${narrator.length} lines`);
    breathless.forEach((l) => console.log(l));

    const others = spoken.filter((c) => c.voice !== "narrator" && c.words?.length);
    const crowded = narrator.flatMap((n) =>
      others.flatMap((o) => {
        const nFirst = n.words![0]!.startMs;
        const nLast = n.words!.at(-1)!.endMs;
        const oFirst = o.words![0]!.startMs;
        const oLast = o.words!.at(-1)!.endMs;
        const gap = Math.max(nFirst - oLast, oFirst - nLast);
        return gap >= SAGE_CLEAR_MS ? [] : [`  ${n.id} is ${Math.round(gap)} ms from ${o.id}, word to word`];
      }),
    );
    report(crowded.length === 0, `the narrator stays ${SAGE_CLEAR_MS} ms clear of every other voice, last word to first word`, others.length ? `${others.length} other voice lines` : "no other voice in this film");
    crowded.forEach((l) => console.log(l));
  }

  const whooshes = Object.fromEntries(cues.cues.filter((c) => c.sound.startsWith("whoosh")).map((c) => [c.id, c.durMs]));
  report(JSON.stringify(whooshes) === JSON.stringify(WHOOSHES[name]), "the only whooshes are the island opening and the note arc", Object.entries(whooshes).map(([id, ms]) => `${id} ${ms} ms`).join(", "));
  const retired = cues.cues.filter((c) => /^(push-|scrollToPay)/.test(c.id));
  report(retired.length === 0, "no camera push or scroll cue is left", `${retired.length} found`);
  const mixHash = createHash("sha256").update(await readFile(join(dir, "mix.wav"))).digest("hex");
  report(cues.mixSha256 === mixHash, "cues.json carries the sha256 of mix.wav", `${cues.mixSha256.slice(0, 16)} vs ${mixHash.slice(0, 16)}`);

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
