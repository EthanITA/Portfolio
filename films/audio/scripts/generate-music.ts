import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./build";
import { FILMS, type FilmName, MUSIC_SKELETON, MUSIC_VARIANT } from "./films";
import { logSpend, requestAudio, skeleton, writeJson } from "./lib/openrouter";

const MODEL = "google/lyria-3-pro-preview";
const SEED = 4107;

const sniff = (b: Buffer): string => {
  if (b.subarray(0, 4).toString() === "RIFF") return "wav";
  if (b.subarray(0, 4).toString() === "fLaC") return "flac";
  if (b.subarray(0, 4).toString() === "OggS") return "ogg";
  if (b.subarray(0, 3).toString() === "ID3" || (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0)) return "mp3";
  if (b.subarray(4, 8).toString() === "ftyp") return "m4a";
  throw new Error(`unrecognised audio container, first bytes ${b.subarray(0, 12).toString("hex")}`);
};

const main = async (): Promise<void> => {
  const [name, ...flags] = process.argv.slice(2);
  if (!name || !(name in FILMS)) throw new Error(`usage: generate-music.ts <${Object.keys(FILMS).join("|")}> [--take N] [--force] [--format wav|mp3] [--no-stream]`);
  const film = name as FilmName;
  const arg = (flag: string): string | undefined => flags[flags.indexOf(flag) + 1];
  const take = flags.includes("--take") ? Number(arg("--take")) : 1;
  const format = flags.includes("--format") ? arg("--format")! : "mp3";
  const dir = join(ROOT, film, "sources");
  await mkdir(dir, { recursive: true });
  const existing = (await readdir(dir)).filter((f) => f.startsWith(`music.take${take}.`) && !f.endsWith(".json"));
  if (existing.length && !flags.includes("--force")) throw new Error(`${existing[0]} is already paid for; pass --force to pay again`);

  const seconds = FILMS[film].durationMs / 1000;
  const prompt = `${MUSIC_SKELETON} ${MUSIC_VARIANT[film]} Aim for about ${seconds + 15} seconds.`;
  const result = await requestAudio({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    audio: { format },
    seed: SEED + take,
    stream: !flags.includes("--no-stream"),
  });
  await writeJson(join(ROOT, "_work", `${film}-music-shape.json`), result.shape);
  await logSpend(MODEL, `${film} bed take ${take}`, result.cost);
  if (!result.audio.length) throw new Error(`no audio came back; response text: ${result.text.slice(0, 400)}; shape ${JSON.stringify(skeleton(result.shape)).slice(0, 800)}`);
  const ext = sniff(result.audio);
  await writeFile(join(dir, `music.take${take}.${ext}`), result.audio);
  await writeJson(join(dir, `music.take${take}.json`), { model: MODEL, seed: SEED + take, format, prompt, id: result.id, cost: result.cost, text: result.text, bytes: result.audio.length });
  console.log(`${film} take ${take}: ${result.audio.length} bytes ${ext}, cost ${result.cost}`);
};

await main();
