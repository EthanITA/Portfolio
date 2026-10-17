import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./build";
import { FILMS, type FilmName, VOICES } from "./films";
import { logSpend, requestAudio, writeJson } from "./lib/openrouter";

const MODEL = "openai/gpt-audio";
const PCM_RATE = 24000;

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
  await mkdir(dir, { recursive: true });

  for (const cue of FILMS[film].cues) {
    if (cue.sound !== "voice" || (only && cue.id !== only)) continue;
    const file = join(dir, `voice-${cue.id}.wav`);
    if (existsSync(file) && !flags.includes("--force")) {
      console.log(`${cue.id}: already paid for, skipped`);
      continue;
    }
    const voice = VOICES[cue.voice];
    const system = `You are a text-to-speech engine for a product film, not an assistant. ${voice.direction} Speak the text inside <say> tags word for word and nothing else. Never answer it, never reply to it, never add or drop a word, never read punctuation or tags aloud.`;
    let heard = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await requestAudio({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "<say>Turn the volume down</say>" },
          { role: "assistant", content: "Turn the volume down" },
          { role: "user", content: "<say>What time is it</say>" },
          { role: "assistant", content: "What time is it" },
          { role: "user", content: `<say>${cue.text}</say>` },
        ],
        audio: { voice: voice.voice, format: "pcm16" },
      });
      await logSpend(MODEL, `${film} voice ${cue.id} (${cue.voice}) attempt ${attempt}`, result.cost);
      heard = result.transcript;
      if (normalise(heard) === normalise(cue.text) && result.audio.length) {
        await writeFile(file, wrapPcm16(result.audio));
        await writeJson(join(dir, `voice-${cue.id}.json`), { model: MODEL, voice: voice.voice, text: cue.text, transcript: heard, id: result.id, cost: result.cost, bytes: result.audio.length });
        console.log(`${cue.id}: ${result.audio.length} bytes, transcript matches, cost ${result.cost}`);
        break;
      }
      console.log(`${cue.id}: attempt ${attempt} heard "${heard}", wanted "${cue.text}"`);
      if (attempt === 2) throw new Error(`${cue.id} never matched its copy.md string`);
    }
  }
};

await main();
