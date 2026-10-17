import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { NARRATOR_PAUSES, ROOT, findSource, prepareVoice, takeShas } from "./build";
import { FILMS, type FilmName, spokenForm } from "./films";
import { msAt, run, writeWav24 } from "./lib/audio";
import { writeJson } from "./lib/openrouter";
import { type Cut, type Heard, type TakeWords, type WordsFile, alignWords, envelope, loadWords, probesFor, settleWords, spokenWords } from "./lib/words";

const ALIGNER = "pocketsphinx forced alignment checked against faster-whisper small, starts moved past gaps, disputes settled by cut-and-transcribe";
const LIB = join(import.meta.dirname, "lib");

const sphinxWord = (word: string): string => word.toLowerCase().replace(/[^a-z']/g, "");

const main = async (): Promise<void> => {
  const [name, ...flags] = process.argv.slice(2);
  if (!name || !(name in FILMS)) throw new Error(`usage: align.ts <${Object.keys(FILMS).join("|")}> [--only cue-id]`);
  const film = name as FilmName;
  const only = flags.includes("--only") ? flags[flags.indexOf("--only") + 1] : undefined;
  const sources = join(ROOT, film, "sources");
  const work = join(ROOT, "_work", "align", film);
  await mkdir(work, { recursive: true });

  const jobs: Array<{ id: string; text: string; file: string; takeSha: string; clipSha: string; clipMs: number; env: number[] }> = [];
  for (const cue of FILMS[film].cues) {
    if (cue.sound !== "voice" || (only && cue.id !== only)) continue;
    const file = await findSource(sources, `voice-${cue.id}`);
    if (!file) {
      console.log(`${cue.id}: no take yet, skipped`);
      continue;
    }
    const { clip, onset } = await prepareVoice(file, cue.voice === "narrator" ? NARRATOR_PAUSES : undefined);
    const speech = { l: clip.l.subarray(onset), r: clip.r.subarray(onset) };
    const wav = join(work, `${cue.id}.wav`);
    await writeWav24(wav, speech);
    jobs.push({
      id: cue.id, text: cue.text, file: wav, ...(await takeShas(file, clip)), clipMs: Math.round(msAt(speech.l.length)), env: envelope(speech.l),
    });
  }

  const whisperManifest = join(work, "whisper-manifest.json");
  const sphinxManifest = join(work, "sphinx-manifest.json");
  const whisperOut = join(work, "whisper.json");
  const sphinxOut = join(work, "sphinx.json");
  await writeJson(whisperManifest, jobs.map((j) => ({ id: j.id, file: j.file, spoken: spokenForm(j.text) })));
  await writeJson(sphinxManifest, jobs.map((j) => ({ id: j.id, file: j.file, words: j.text.split(/\s+/).flatMap(spokenWords).map(sphinxWord) })));
  const whisper = await run("uv", ["run", "--python", "3.11", "--with", "faster-whisper", "python", join(LIB, "whisper_words.py"), whisperManifest, whisperOut]);
  console.log(whisper.err.split("\n").filter((line) => line.includes(" heard ")).join("\n"));
  await run("uv", ["run", "--python", "3.11", "--with", "pocketsphinx", "--with", "numpy", "python", join(LIB, "sphinx_words.py"), sphinxManifest, sphinxOut]);
  const heard = JSON.parse(await readFile(whisperOut, "utf8")) as Record<string, Heard[]>;
  const forced = JSON.parse(await readFile(sphinxOut, "utf8")) as Record<string, Heard[]>;

  const pairs = jobs.map((job) => ({ job, whisper: alignWords(job.text, heard[job.id] ?? []), aligned: alignWords(job.text, forced[job.id] ?? []) }));
  const tailManifest = join(work, "tail-manifest.json");
  const tailOut = join(work, "tail.json");
  const probes = pairs.map(({ job, whisper, aligned }) => ({ id: job.id, file: job.file, probes: probesFor(whisper, aligned, job.env) })).filter((p) => p.probes.length);
  await writeJson(tailManifest, probes);
  if (probes.length) await run("uv", ["run", "--python", "3.11", "--with", "faster-whisper", "--with", "numpy", "python", join(LIB, "tail_words.py"), tailManifest, tailOut]);
  const tails = probes.length ? (JSON.parse(await readFile(tailOut, "utf8")) as Record<string, Array<{ index: number; cuts: Cut[] }>>) : {};

  const previous = loadWords(film);
  const takes: Record<string, TakeWords> = only && previous ? { ...previous.takes } : {};
  for (const { job, whisper, aligned } of pairs) {
    const cuts = Object.fromEntries((tails[job.id] ?? []).map((t) => [t.index, t.cuts]));
    const words = settleWords(whisper, aligned, job.env, cuts);
    takes[job.id] = { takeSha: job.takeSha, clipSha: job.clipSha, clipMs: job.clipMs, spoken: spokenForm(job.text), words };
    const contested = words.filter((w) => w.onset === "contested").map((w) => w.text);
    console.log(`${job.id}: ${words.length} words over ${job.clipMs} ms, onsets ${words.map((w) => w.onset[0]).join("")}${contested.length ? `, contested: ${contested.join(" ")}` : ""}`);
  }
  const ordered = Object.fromEntries(Object.entries(takes).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  await writeJson(join(sources, "words.json"), { aligner: ALIGNER, takes: ordered } satisfies WordsFile);
};

await main();
