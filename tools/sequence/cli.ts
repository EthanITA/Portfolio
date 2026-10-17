import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

import { ffmpeg } from "../render/encode.ts";
import { Render } from "../render/index.ts";

const root = resolve(import.meta.dirname, "../..");
const publicDir = join(root, "public/sequence");
const manifestFile = join(root, "app/utils/scroll/manifest.gen.ts");

const THEMES = ["light", "dark"] as const;
const SCREENS = ["sidecar", "sage", "shell"] as const;
const FRAMES = 192;
const FILM_MS = 6400;
const LQ = [...Array.from({ length: FRAMES / 8 }, (_, n) => n * 8), FRAMES - 1];
const PLACEHOLDER = { light: "#ffffff", dark: "#18181b" } as const;

type Theme = (typeof THEMES)[number];
type Format = "avif" | "webp";
type Quads = Record<(typeof SCREENS)[number], [number, number][]>;
type Set = { name: string; dir: string; width: number; format: Format; quality: number; budget?: number; only?: number[] };

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    work: { type: "string", default: join(tmpdir(), "madong-sequence") },
    stills: { type: "string" },
    port: { type: "string" },
    themes: { type: "string", default: THEMES.join(",") },
  },
});

const work = resolve(values.work);
const themes = values.themes.split(",").filter((theme): theme is Theme => (THEMES as readonly string[]).includes(theme));
const pad = (index: number): string => String(index).padStart(3, "0");
const mb = (bytes: number): string => `${(bytes / 1_000_000).toFixed(2)} MB`;

const freePort = (): Promise<number> =>
  new Promise((done) => {
    const probe = createServer().listen(0, () => {
      const address = probe.address();
      probe.close(() => done(typeof address === "object" && address ? address.port : 0));
    });
  });

// Same BT.709 tagging as tools/render, so the baked --canvas background decodes to the page colour.
const scale = (width: number): string[] => ["-vf", `scale=${width}:-2:out_color_matrix=bt709:flags=lanczos`, "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1"];

const codec = (format: Format, quality: number): string[] =>
  format === "avif"
    ? ["-pix_fmt", "yuv444p", "-c:v", "libaom-av1", "-still-picture", "1", "-crf", String(quality), "-cpu-used", "6", "-row-mt", "1", "-threads", "2", "-f", "avif"]
    : ["-pix_fmt", "yuv420p", "-c:v", "libwebp", "-quality", String(quality), "-compression_level", "6"];

// Dark re-renders flip a few pixels by up to 9 levels between runs; past 80 dB that vanishes in the AVIF encode.
const MIN_PSNR = 80;

const psnr = async (a: string, b: string): Promise<number> => {
  const log = await ffmpeg(["-i", a, "-i", b, "-lavfi", "psnr", "-f", "null", "-"]);
  const average = /average:(inf|[\d.]+)/.exec(log)?.[1];
  return average === "inf" ? Infinity : Number(average);
};

const pool = async <T>(items: T[], task: (item: T) => Promise<unknown>): Promise<void> => {
  const order = items.values();
  await Promise.all(Array.from({ length: Math.max(1, Math.floor(availableParallelism() / 2)) }, async () => {
    for (const item of order) await task(item);
  }));
};

const encodeStill = (input: string, out: string, width: number, format: Format, quality: number): Promise<string> =>
  ffmpeg(["-i", input, ...scale(width), ...codec(format, quality), "-frames:v", "1", out]);

const size = async (dir: string, extension: string): Promise<number> => {
  const files = (await readdir(dir)).filter((file) => file.endsWith(extension));
  const sizes = await Promise.all(files.map(async (file) => (await stat(join(dir, file))).size));
  return sizes.reduce((sum, bytes) => sum + bytes, 0);
};

const stills = async (): Promise<void> => {
  for (const theme of themes) {
    const dir = join(publicDir, theme, "screens");
    await mkdir(dir, { recursive: true });
    const sourceDir = join(work, "stills", theme);
    await mkdir(sourceDir, { recursive: true });
    for (const screen of SCREENS) {
      const source = values.stills ? join(resolve(values.stills), theme, `${screen}.png`) : join(sourceDir, `${screen}.png`);
      if (!values.stills) await ffmpeg(["-f", "lavfi", "-i", `color=c=${PLACEHOLDER[theme]}:s=1600x1000`, "-frames:v", "1", source]);
      for (const width of [1600, 800]) {
        await encodeStill(source, join(dir, `${screen}-${width}.avif`), width, "avif", 20);
        await encodeStill(source, join(dir, `${screen}-${width}.webp`), width, "webp", 85);
      }
    }
    console.log(`${theme} stills ${values.stills ? `from ${values.stills}` : "as flat placeholders"}`);
  }
};

const render = async (): Promise<Quads> => {
  const route = "/film/sequence";
  // Render.serve reuses whatever answers on its port, so a fixed one can render another worktree's dev server.
  const server = await Render.serve({ route, port: values.port ? Number(values.port) : await freePort(), root });
  try {
    for (const theme of themes) {
      const started = performance.now();
      const options = { url: `${server.origin}${route}?theme=${theme}`, width: 1920, height: 1080, fps: FRAMES / (FILM_MS / 1000), to: FILM_MS };
      const frames = await Render.frames({ ...options, dir: join(work, "frames", theme) });
      console.log(`${theme} rendered ${frames.count} frames in ${((performance.now() - started) / 1000).toFixed(0)} s`);
      const mismatches = await Render.check({ ...options, frames, samples: 8 });
      const drift = await Promise.all(mismatches.map(({ index }) => psnr(join(frames.dir, Render.Frame.name(index)), join(frames.dir, "check", Render.Frame.name(index)))));
      const worst = Math.min(...drift);
      if (worst < MIN_PSNR) throw new Error(`${theme} frames ${mismatches.map(({ index }) => index).join(", ")} differ on re-render, worst ${worst.toFixed(1)} dB`);
      console.log(`${theme} re-rendered 8 frames in fresh pages, ${8 - mismatches.length} identical${mismatches.length ? `, ${mismatches.length} within ${worst.toFixed(1)} dB` : ""}`);
    }
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${server.origin}${route}?theme=light`);
    await page.waitForFunction(() => typeof (window as unknown as { __ready?: unknown }).__ready === "function");
    await page.evaluate(() => (window as unknown as { __ready: () => Promise<void> }).__ready());
    const quads = (await page.evaluate(() => (window as unknown as { __quads: () => unknown }).__quads())) as Quads;
    await browser.close();
    await writeFile(join(work, "quads.json"), JSON.stringify(quads));
    return quads;
  } finally {
    server.stop();
  }
};

const encodeSet = async (frames: string, set: Set): Promise<number> => {
  await mkdir(set.dir, { recursive: true });
  const indices = set.only ?? Array.from({ length: FRAMES }, (_, index) => index);
  let quality = set.quality;
  for (let round = 0; ; round++) {
    await Promise.all((await readdir(set.dir)).filter((file) => file.endsWith(`.${set.format}`)).map((file) => rm(join(set.dir, file))));
    await pool(indices, (index) => encodeStill(join(frames, Render.Frame.name(index)), join(set.dir, `${pad(index)}.${set.format}`), set.width, set.format, quality));
    const bytes = await size(set.dir, `.${set.format}`);
    console.log(`${set.name} ${set.format} q${quality}: ${indices.length} frames, ${mb(bytes)}${set.budget ? ` of ${mb(set.budget)}` : ""}`);
    if (!set.budget || bytes <= set.budget) return bytes;
    if (round === 3) throw new Error(`${set.name} ${set.format} is ${mb(bytes)}, over its ${mb(set.budget)} budget after 4 rounds`);
    quality = set.format === "avif" ? quality + 3 : quality - 8;
  }
};

const encode = async (quads: Quads): Promise<void> => {
  for (const theme of themes) {
    const frames = join(work, "frames", theme);
    const sets: Set[] = [
      { name: `${theme}/1920`, dir: join(publicDir, theme, "1920"), width: 1920, format: "avif", quality: 18, budget: 6_000_000 },
      { name: `${theme}/1920`, dir: join(publicDir, theme, "1920"), width: 1920, format: "webp", quality: 72, budget: 6_000_000 },
      { name: `${theme}/960`, dir: join(publicDir, theme, "960"), width: 960, format: "avif", quality: 22, budget: 2_500_000 },
      { name: `${theme}/960`, dir: join(publicDir, theme, "960"), width: 960, format: "webp", quality: 68, budget: 2_500_000 },
      { name: `${theme}/lq`, dir: join(publicDir, theme, "lq"), width: 960, format: "avif", quality: 50, only: LQ },
      { name: `${theme}/lq`, dir: join(publicDir, theme, "lq"), width: 960, format: "webp", quality: 30, only: LQ },
    ];
    for (const set of sets) await encodeSet(frames, set);
  }
  const files = (await readdir(publicDir, { recursive: true })).filter((file) => /\.(avif|webp)$/.test(file)).sort();
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update(await readFile(join(publicDir, file)));
  const reach = Math.max(...Object.values(quads).flat().map(([u]) => Math.abs(u - 0.5))) + 0.03;
  const manifest = {
    version: hash.digest("hex").slice(0, 10),
    lq: LQ,
    safe: [Number((0.5 - reach).toFixed(4)), Number((0.5 + reach).toFixed(4))],
    screens: quads,
  };
  await writeFile(manifestFile, `export const MANIFEST = ${JSON.stringify(manifest, undefined, 2)} as const;\n`);
  console.log(`manifest ${manifest.version}, safe ${manifest.safe.join(" to ")}`);
};

const [command = "all"] = positionals;
if (command === "stills") await stills();
else if (command === "render") await render();
else if (command === "encode") await encode(JSON.parse(await readFile(join(work, "quads.json"), "utf8")) as Quads);
else if (command === "all") {
  await stills();
  await encode(await render());
} else {
  console.error("usage: tsx tools/sequence/cli.ts [all | stills | render | encode] [--work dir] [--stills dir] [--themes light,dark]");
  process.exit(1);
}
