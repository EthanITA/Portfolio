import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type CDPSession, type Page } from "playwright";
import type {} from "./contract.ts";

export type FramesOptions = {
  url: string;
  dir: string;
  width: number;
  height: number;
  scale?: number;
  fps?: number;
  from?: number;
  to?: number;
  only?: number[];
  workers?: number;
  timeout?: number;
  onProgress?: (done: number, total: number) => void;
};

export type Frames = {
  dir: string;
  pattern: string;
  fps: number;
  from: number;
  count: number;
  width: number;
  height: number;
  hashes: Map<number, string>;
};

const FRAME_FILE = /^\d{6}\.png$/;

export const Frame = {
  pattern: "%06d.png",
  name: (index: number): string => `${String(index).padStart(6, "0")}.png`,
  time: ({ from = 0, fps = 60, index }: { from?: number; fps?: number; index: number }): number => from + (index * 1000) / fps,
};

const DETERMINISM_CSS = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}";

// Same seed in every page, so a scene that calls Math.random at mount builds the same world in every worker.
const INIT_SCRIPT = `(() => {
  let seed = 0x9e3779b9;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const style = () => {
    const tag = document.createElement("style");
    tag.textContent = ${JSON.stringify(DETERMINISM_CSS)};
    document.head.append(tag);
  };
  if (document.head) style();
  else document.addEventListener("DOMContentLoaded", style, { once: true });
})();`;

// SwiftShader over Metal: the GPU path gave different pixels for the same frame across runs and was no faster.
const LAUNCH_ARGS = [
  "--force-color-profile=srgb",
  "--hide-scrollbars",
  "--disable-lcd-text",
  "--font-render-hinting=none",
  "--disable-checker-imaging",
  "--disable-partial-raster",
  "--disable-threaded-animation",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
];

export const launch = (): Promise<Browser> => chromium.launch({ headless: true, args: LAUNCH_ARGS });

const withTimeout = <T>(promise: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms).unref())]);

type Worker = { page: Page; cdp: CDPSession; stale: boolean; errors: string[] };

export const openPage = async ({ browser, url, width, height, scale = 1, timeout = 120_000 }: { browser: Browser; url: string; width: number; height: number; scale?: number; timeout?: number }): Promise<Worker> => {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: "no-preference", colorScheme: "light" });
  await context.addInitScript(INIT_SCRIPT);
  const page = await context.newPage();
  const worker: Worker = { page, cdp: await context.newCDPSession(page), stale: false, errors: [] };
  page.on("pageerror", (error) => worker.errors.push(error.message));
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) worker.stale = true;
  });
  await arm({ worker, url, timeout });
  return worker;
};

const arm = async ({ worker, url, timeout }: { worker: Worker; url: string; timeout: number }): Promise<void> => {
  await worker.page.goto(url, { waitUntil: "load", timeout });
  await worker.page.waitForFunction(() => typeof window.__seek === "function" && typeof window.__ready === "function", undefined, { timeout }).catch(() => {
    throw new Error(`${url} never exposed window.__seek and window.__ready; mount it through useFilm()`);
  });
  // anime.js leaves a delayed tween unstyled until the playhead first passes it, so sweep once or a fresh page shows it early.
  await worker.page.evaluate(async () => {
    await window.__ready();
    if (window.__duration) await window.__seek(window.__duration);
    await window.__seek(0);
  });
  worker.stale = false;
};

const capture = async ({ worker, ms, timeout }: { worker: Worker; ms: number; timeout: number }): Promise<Buffer> => {
  await withTimeout(
    worker.page.evaluate(async (at) => {
      await window.__seek(at);
      await window.__ready();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, ms),
    timeout,
    `frame at ${ms} ms`,
  );
  const { data } = await worker.cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
  return Buffer.from(data, "base64");
};

export const duration = async (worker: Worker): Promise<number> => worker.page.evaluate(() => window.__duration);

export const clearFrames = async (dir: string): Promise<void> => {
  await mkdir(dir, { recursive: true });
  const stale = (await readdir(dir)).filter((file) => FRAME_FILE.test(file));
  await Promise.all(stale.map((file) => rm(join(dir, file))));
};

export const renderFrames = async ({ url, dir, width, height, scale = 1, fps = 60, from = 0, to, only, workers, timeout = 30_000, onProgress }: FramesOptions): Promise<Frames> => {
  const outWidth = Math.round(width * scale);
  const outHeight = Math.round(height * scale);
  const browsers: Browser[] = [];
  try {
    const first = await launch();
    browsers.push(first);
    const probe = await openPage({ browser: first, url, width, height, scale });
    const length = await duration(probe);
    if (!length && !to) throw new Error(`${url} reports no __duration; pass --to`);
    const end = to || length;
    if (length && end > length) throw new Error(`--to ${end} is past the film's ${length} ms`);
    if (end <= from) throw new Error(`empty range ${from} to ${end} ms`);

    const count = Math.round(((end - from) * fps) / 1000);
    const queue = only ? [...only] : Array.from({ length: count }, (_, index) => index);
    const outside = queue.filter((index) => index < 0 || index >= count);
    if (outside.length) throw new Error(`frames ${outside.join(", ")} are outside 0 to ${count - 1}`);
    if (!only) await clearFrames(dir);
    else await mkdir(dir, { recursive: true });

    const size = Math.max(1, Math.min(workers || Math.floor(availableParallelism() / 2), queue.length));
    const pages: Worker[] = [probe];
    for (let n = 1; n < size; n++) {
      const browser = await launch();
      browsers.push(browser);
      pages.push(await openPage({ browser, url, width, height, scale }));
    }

    const hashes = new Map<number, string>();
    // One iterator shared by every worker, so each frame is taken exactly once whoever is free first.
    const order = queue.values();
    const run = async (worker: Worker): Promise<void> => {
      for (const index of order) {
        const ms = Frame.time({ from, fps, index });
        let png = await capture({ worker, ms, timeout });
        if (worker.stale) {
          await arm({ worker, url, timeout });
          png = await capture({ worker, ms, timeout });
        }
        if (worker.errors.length) throw new Error(`page error at ${ms} ms: ${worker.errors.join("; ")}`);
        await writeFile(join(dir, Frame.name(index)), png);
        hashes.set(index, createHash("sha256").update(png).digest("hex"));
        onProgress?.(hashes.size, queue.length);
      }
    };
    await Promise.all(pages.map(run));

    return { dir, pattern: Frame.pattern, fps, from, count, width: outWidth, height: outHeight, hashes };
  } finally {
    await Promise.all(browsers.map((browser) => browser.close()));
  }
};

export type Mismatch = { index: number; ms: number; first: string; second: string };

export const checkFrames = async ({ frames, samples = 12, ...options }: Omit<FramesOptions, "dir" | "only"> & { frames: Frames; samples?: number }): Promise<Mismatch[]> => {
  const last = frames.count - 1;
  const spread = Array.from({ length: Math.min(samples, frames.count) }, (_, n) => Math.round((n * last) / Math.max(1, samples - 1)));
  // Reversed and interleaved across fresh pages, so a frame that leaks state from the one seeked before it cannot match.
  const only = [...new Set(spread)].reverse();
  const second = await renderFrames({ ...options, dir: join(frames.dir, "check"), only, workers: Math.min(3, only.length) });
  return only.flatMap((index) => {
    const first = frames.hashes.get(index) ?? "";
    const again = second.hashes.get(index) ?? "";
    return first === again ? [] : [{ index, ms: Frame.time({ from: frames.from, fps: frames.fps, index }), first, second: again }];
  });
};
