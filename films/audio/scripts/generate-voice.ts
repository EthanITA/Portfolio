import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NARRATOR_PAUSES, ROOT, prepareVoice } from "./build";
import { FILMS, type FilmName, VOICES, spokenForm } from "./films";
import { msAt } from "./lib/audio";
import { logSpend, requestAudio, writeJson } from "./lib/openrouter";

const MODEL = "openai/gpt-audio";
const PCM_RATE = 24000;
const MAX_ATTEMPTS = 10;

const PACE = [
  " Say the whole line in one breath, with no pause between its sentences longer than a comma.",
  " Say the whole line in one breath with no pause between its sentences, noticeably faster than a relaxed read.",
  " Say the whole line at a rapid pace, about 210 words per minute, in one breath with no pauses at all and every word still clear.",
];

const wrapPcm16 = (pcm: Buffer): Buffer => {
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + pcm.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(PCM_RATE, 24);
  head.writeUInt32LE(PCM_RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
};

const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();

const main = async (): Promise<void> => {
  const [name, ...flags] = process.argv.slice(2);
  if (!name || !(name in FILMS)) throw new Error(`usage: generate-voice.ts <${Object.keys(FILMS).join("|")}> [--only cue-id] [--force]`);
  const film = name as FilmName;
  const only = flags.includes("--only") ? flags[flags.indexOf("--only") + 1] : undefined;
  const dir = join(ROOT, film, "sources");
  const scratch = join(ROOT, "_work", "takes", film);
  await mkdir(dir, { recursive: true });
  await mkdir(scratch, { recursive: true });
  const unfit: string[] = [];

  for (const cue of FILMS[film].cues) {
    if (cue.sound !== "voice" || (only && cue.id !== only)) continue;
    const file = join(dir, `voice-${cue.id}.wav`);
    if (existsSync(file) && !flags.includes("--force")) {
      console.log(`${cue.id}: already paid for, skipped`);
      continue;
    }
    const voice = VOICES[cue.voice];
    const spoken = spokenForm(cue.text);
    const room = cue.until ? cue.until - cue.at : undefined;
    const pauses = cue.voice === "narrator" ? NARRATOR_PAUSES : undefined;
    const speechOf = async (take: string): Promise<number> => {
      const { clip, onset } = await prepareVoice(take, pauses);
      return msAt(clip.l.length - onset);
    };
    let done = false;
    let note = "";
    if (room) {
      const earlier = (await readdir(scratch)).filter((f) => f.startsWith(`${cue.id}.attempt`) && f.endsWith(".wav"));
      const fits = (await Promise.all(earlier.map(async (f) => ({ f, ms: await speechOf(join(scratch, f)) })))).filter((t) => t.ms <= room).sort((a, b) => a.ms - b.ms);
      if (fits[0]) {
        await copyFile(join(scratch, fits[0].f), file);
        await writeJson(join(dir, `voice-${cue.id}.json`), { model: MODEL, voice: voice.voice, text: cue.text, spoken, transcript: spoken, adopted: fits[0].f, speechMs: Math.round(fits[0].ms) });
        console.log(`${cue.id}: adopted ${fits[0].f}, ${Math.round(fits[0].ms)} ms of ${room}`);
        continue;
      }
    }
    for (let attempt = 1; attempt <= (room ? MAX_ATTEMPTS : 2) && !done; attempt++) {
      const system = `You are a text-to-speech engine for a product film, not an assistant. ${voice.direction}${room ? PACE[Math.min(attempt, PACE.length) - 1] : ""} Speak the text inside <say> tags word for word and nothing else. Never answer it, never reply to it, never add or drop a word, never read punctuation or tags aloud.`;
      const result = await requestAudio({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "<say>Turn the volume down</say>" },
          { role: "assistant", content: "Turn the volume down" },
          { role: "user", content: "<say>What time is it</say>" },
          { role: "assistant", content: "What time is it" },
          { role: "user", content: `<say>${spoken}</say>` },
        ],
        audio: { voice: voice.voice, format: "pcm16" },
      });
      await logSpend(MODEL, `${film} voice ${cue.id} (${cue.voice}) attempt ${attempt}`, result.cost);
      const heard = result.transcript;
      if (normalise(heard) !== normalise(spoken) || !result.audio.length) {
        note = `heard "${heard}", wanted "${spoken}"`;
        console.log(`${cue.id}: attempt ${attempt} ${note}`);
        continue;
      }
      const take = join(scratch, `${cue.id}.attempt${attempt}.wav`);
      await writeFile(take, wrapPcm16(result.audio));
      const speechMs = await speechOf(take);
      if (room && speechMs > room) {
        note = `runs ${Math.round(speechMs)} ms and its window is ${room} ms`;
        console.log(`${cue.id}: attempt ${attempt} ${note}`);
        continue;
      }
      await writeFile(file, wrapPcm16(result.audio));
      await writeJson(join(dir, `voice-${cue.id}.json`), { model: MODEL, voice: voice.voice, text: cue.text, spoken, transcript: heard, id: result.id, cost: result.cost, bytes: result.audio.length, speechMs: Math.round(speechMs), attempt });
      console.log(`${cue.id}: ${Math.round(speechMs)} ms${room ? ` of ${room}` : ""}, transcript matches, attempt ${attempt}, cost ${result.cost}`);
      done = true;
    }
    if (!done) unfit.push(`${cue.id} (${note})`);
  }
  if (unfit.length) throw new Error(`no take fits: ${unfit.join("; ")}`);
};

await main();
