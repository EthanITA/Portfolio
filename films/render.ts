import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Encode, Probe, Render, type Media } from "../tools/render/index.ts";
import { voiceOf } from "./scripts/cues.ts";
import sage from "./scripts/sage.ts";
import { SAFE_MARGIN, type FilmScript } from "./scripts/script.ts";
import shell from "./scripts/shell.ts";
import sidecar from "./scripts/sidecar.ts";

const SCRIPTS: Record<string, FilmScript> = { sidecar, sage, shell };
const CUTS: Record<string, { width: number; height: number; suffix: string }> = {
  "16x9": { width: 1280, height: 720, suffix: "" },
  "4x5": { width: 720, height: 900, suffix: "-4x5" },
};
const SCALE = 1.5;
const FPS = 60;
const BUDGET = 20_000_000;

const root = resolve(import.meta.dirname, "..");

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    cut: { type: "string", default: "16x9" },
    check: { type: "string", default: "24" },
    port: { type: "string" },
    fit: { type: "boolean" },
  },
});

type Check = { name: string; pass: boolean; detail: string };

type Placed = { name: string; left: number; right: number; top: number; bottom: number };

const fit = async ({ url, script, width, height }: { url: string; script: FilmScript; width: number; height: number }): Promise<Check[]> => {
  const samples = await Render.sample({
    url,
    width,
    height,
    scale: SCALE,
    times: Array.from({ length: script.duration / 100 }, (_, n) => n * 100),
    read: (): { placed: Placed[]; landed: string; broken: string[] } => ({
      landed: document.querySelector<HTMLElement>(".film-rig")?.dataset.landed ?? "",
      broken: [...document.querySelectorAll(".film-sentence")]
        .filter((sentence) => {
          const range = document.createRange();
          range.selectNodeContents(sentence);
          return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size > 1;
        })
        .map((sentence) => sentence.textContent?.trim() ?? ""),
      placed: [".film-caption", ".film-key-caps", ".film-title [data-word]", ".film-end"].flatMap((selector) =>
        [...document.querySelectorAll(selector)]
          .filter((element) => {
            let opacity = 1;
            for (let node: Element | undefined = element; node; node = node.parentElement ?? undefined) opacity *= Number(getComputedStyle(node).opacity);
            return opacity > 0.05;
          })
          .map((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const box = selector === ".film-end" ? range.getBoundingClientRect() : element.getBoundingClientRect();
            return { name: `${selector} "${element.textContent?.trim()}"`, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
          }),
      ),
    }),
  });
  const landed = samples.at(-1)?.value.landed.split(" ").map(Number) ?? [];
  const shots: Check[] = script.rig.shots.map((shot, index) => ({ name: `shot at ${shot.at} ms${shot.anchor ? ` on "${shot.anchor}"` : ""} lands`, pass: true, detail: `scale ${landed[index]?.toFixed(3)} of ${shot.scale}` }));
  const broken = [...new Set(samples.flatMap(({ value }) => value.broken))];
  const whole: Check = { name: "every caption sentence on one line", pass: !broken.length, detail: broken.length ? `broken: ${broken.join(" | ")}` : "all whole" };
  const closest = new Map<string, { margin: number; ms: number }>();
  for (const { ms, value } of samples) {
    for (const placed of value.placed) {
      const margin = Math.min(placed.left, width - placed.right, placed.top, height - placed.bottom);
      const previous = closest.get(placed.name);
      if (!previous || margin < previous.margin) closest.set(placed.name, { margin, ms });
    }
  }
  return [...shots, whole, ...[...closest].map(([name, { margin, ms }]) => ({ name: `${name} inside the frame`, pass: margin >= SAFE_MARGIN, detail: `${margin.toFixed(1)} px from the edge at ${ms} ms` }))];
};

const verify = async ({ script, files, width, height, audio }: { script: FilmScript; files: string[]; width: number; height: number; audio: boolean }): Promise<Check[]> => {
  const checks: Check[] = [];
  const expect = (name: string, pass: boolean, detail: string): void => {
    checks.push({ name, pass, detail });
  };
  for (const file of files) {
    const media: Media = await Probe.media(file);
    const label = file.slice(file.lastIndexOf("/") + 1);
    expect(`${label} size`, media.width === width && media.height === height, `${media.width}x${media.height}`);
    expect(`${label} fps`, media.fps === FPS, String(media.fps));
    expect(`${label} duration`, Math.abs(media.seconds - script.duration / 1000) <= 0.1, `${media.seconds} s`);
    expect(`${label} bytes`, media.bytes < BUDGET, String(media.bytes));
    expect(`${label} codec`, label.endsWith(".mp4") ? media.video === "h264" : media.video === "vp9", `${media.video} ${media.pixFmt} ${media.colorSpace}`);
    expect(`${label} audio`, audio ? Boolean(media.audio) : !media.audio, media.audio ?? "none");
    if (audio) {
      const drift = Math.abs((media.audioSeconds ?? 0) - (media.videoSeconds ?? 0));
      expect(`${label} audio and video in step`, drift <= 0.02, `audio ${media.audioSeconds} s, video ${media.videoSeconds} s`);
    }
  }
  const [master = ""] = files;
  const black = await Probe.black(master);
  expect("no black stretch", !black.length, JSON.stringify(black));
  const at = [...script.captions, ...voiceOf(script.name)].map((caption) => (caption.at + caption.until) / 2000);
  for (const band of at.length ? await Probe.band(master, { at }) : []) expect(`caption band at ${band.at} s`, band.spread > 40, `spread ${band.spread}`);
  if (audio) {
    const loudness = await Probe.loudness(master);
    expect("integrated loudness", Math.abs(loudness.integrated + 16) <= 1, `${loudness.integrated} LUFS`);
    expect("true peak", loudness.truePeak < -1, `${loudness.truePeak} dBTP`);
  }
  return checks;
};

const film = async (name: string): Promise<boolean> => {
  const script = SCRIPTS[name];
  const cut = CUTS[values.cut];
  if (!script || !cut) throw new Error(`usage: tsx films/render.ts <${Object.keys(SCRIPTS).join("|")}...> [--cut ${Object.keys(CUTS).join("|")}] [--fit]`);

  const route = `/film/${name}`;
  const server = await Render.serve({ route, port: values.port ? Number(values.port) : undefined, root });
  try {
    const started = performance.now();
    const options = { url: `${server.origin}${route}`, width: cut.width, height: cut.height, scale: SCALE, fps: FPS };
    const placement = await fit({ url: options.url, script, width: cut.width, height: cut.height });
    const misplaced = placement.filter((check) => !check.pass);
    if (values.fit) {
      console.log(JSON.stringify({ film: `${name}${cut.suffix}`, placement, failed: misplaced.length }, undefined, 2));
      return !misplaced.length;
    }
    if (misplaced.length) {
      console.log(JSON.stringify({ film: `${name}${cut.suffix}`, misplaced }, undefined, 2));
      return false;
    }
    const frames = await Render.frames({
      ...options,
      dir: join(root, "films/out", `${name}${cut.suffix}`, "frames"),
      onProgress: (done, total) => {
        if (done % 300 === 0 || done === total) console.error(`${name}${cut.suffix} ${done}/${total}`);
      },
    });
    const mismatches = await Render.check({ ...options, frames, samples: Number(values.check) });
    if (mismatches.length) throw new Error(`${name} is not deterministic: ${JSON.stringify(mismatches)}`);

    const mix = join(root, "films/audio", name, "mix.wav");
    const audio = existsSync(mix) ? mix : undefined;
    const base = join(root, "public/films", `${name}${cut.suffix}`);
    const files = [];
    for (const [codec, extension] of [["h264", "mp4"], ["vp9", "webm"]] as const) {
      files.push((await Encode.video({ frames, codec, out: `${base}.${extension}`, audio, budget: BUDGET })).out);
    }
    const index = Math.round((script.poster * FPS) / 1000);
    const posters = await Promise.all([".jpg", ".webp"].map((extension) => Encode.poster({ frames, index, out: `${base}-poster${extension}` })));

    const checks = [...placement, ...(await verify({ script, files, width: frames.width, height: frames.height, audio: Boolean(audio) }))];
    const failed = checks.filter((check) => !check.pass);
    console.log(JSON.stringify({ film: `${name}${cut.suffix}`, seconds: Math.round((performance.now() - started) / 1000), frames: frames.count, audio: audio ?? "none", files, posters, checks, failed: failed.length }, undefined, 2));
    return !failed.length;
  } finally {
    server.stop();
  }
};

let ok = true;
for (const name of positionals) ok = (await film(name)) && ok;
process.exit(ok ? 0 : 1);
