import { readFile, readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

const root = resolve(import.meta.dirname, "../..");
const site = join(root, ".output/public");
const PORT = 4104;
const BEATS = [
  [0.04, 0.14],
  [0.3, 0.48],
  [0.56, 0.72],
  [0.74, 0.96],
] as const;
const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

type Probe = { progress: number; frame: number; phase: string; state: string; tiles: boolean; visible: boolean[] };

const failures: string[] = [];
const expect = (ok: boolean, message: string): void => {
  if (!ok) failures.push(message);
};

const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
  for (const candidate of [join(site, path), join(site, path, "index.html"), join(site, `${path}.html`)]) {
    const info = await stat(candidate).catch(() => undefined);
    if (!info?.isFile()) continue;
    response.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
    response.end(await readFile(candidate));
    return;
  }
  response.writeHead(404).end();
});
await new Promise<void>((done) => server.listen(PORT, done));

const probe = (page: Page): Promise<Probe> =>
  page.evaluate(() => {
    const section = document.querySelector<HTMLElement>("[data-scene=sequence]")!;
    return {
      progress: Number(section.dataset.progress),
      frame: Number(section.dataset.frame),
      phase: section.dataset.phase ?? "",
      state: section.dataset.state ?? "",
      tiles: section.dataset.tiles === "true",
      visible: [...section.querySelectorAll<HTMLElement>("[data-line]")].map((line) => line.dataset.visible === "true" && Number(getComputedStyle(line).opacity) > 0),
    };
  });

const scrub = (page: Page, progress: number): Promise<void> =>
  page.evaluate((p) => {
    const section = document.querySelector<HTMLElement>("[data-scene=sequence]")!;
    const top = section.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + p * (section.offsetHeight - innerHeight));
  }, progress);

const settle = (page: Page): Promise<void> => page.waitForTimeout(700);

const run = async ({ width, height, reduced }: { width: number; height: number; reduced?: boolean }): Promise<Record<string, unknown>> => {
  const label = `${width}x${height}${reduced ? " reduced" : ""}`;
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.text().includes("THREE.")) errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`failed: ${request.url()} ${request.failure()?.errorText}`));
  page.on("response", (response) => response.status() >= 400 && errors.push(`${response.status()}: ${response.url()}`));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  const report: Record<string, unknown> = { label };

  const sizes = await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>("[data-scene=sequence]")!;
    const stage = section.firstElementChild as HTMLElement;
    return { ratio: section.offsetHeight / innerHeight, sticky: getComputedStyle(stage).position, lines: [...section.querySelectorAll("[data-line]")].map((line) => line.textContent?.trim()) };
  });
  report.sizes = sizes;
  expect(sizes.lines.length === 4, `${label}: expected 4 lines in the DOM, got ${sizes.lines.length}`);

  if (reduced) {
    const state = await probe(page);
    await scrub(page, 0.5);
    await settle(page);
    const animations = await page.evaluate(() => document.getAnimations().length);
    report.reduced = { state: state.state, sticky: sizes.sticky, animations };
    expect(state.state === "reduced", `${label}: data-state is ${state.state}`);
    expect(sizes.sticky !== "sticky", `${label}: the stage is still sticky`);
    expect(animations === 0, `${label}: ${animations} animations running`);
  } else {
    expect(Math.abs(sizes.ratio - (width < 768 ? 3 : 4)) < 0.02, `${label}: section is ${sizes.ratio.toFixed(2)} viewports tall`);
    await page.waitForFunction(() => document.querySelector<HTMLElement>("[data-scene=sequence]")?.dataset.state !== "poster", undefined, { timeout: 15000 });

    await scrub(page, 0);
    await settle(page);
    const top = await probe(page);
    expect(top.frame === 0, `${label}: frame ${top.frame} at the section top`);

    const progress: number[] = [];
    const deltas: number[] = [];
    // A string, because tsx names inner functions with a __name helper the page doesn't have.
    await page.evaluate(`(() => {
      const samples = (window.__deltas = []);
      let last = performance.now();
      const tick = (now) => {
        samples.push(now - last);
        last = now;
        if (samples.length < 600) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    })()`);
    for (let step = 0; step <= 100; step++) {
      await scrub(page, step / 100);
      await page.waitForTimeout(40);
      progress.push((await probe(page)).progress);
    }
    deltas.push(...(await page.evaluate(() => (window as unknown as { __deltas: number[] }).__deltas)));
    const sorted = deltas.slice(5).sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const backwards = progress.findIndex((value, index) => index > 0 && value < progress[index - 1]!);
    report.monotonic = { samples: progress.length, first: progress[0], last: progress.at(-1), backwardsAt: backwards };
    report.rafP95 = Number(p95.toFixed(1));
    expect(backwards === -1, `${label}: data-progress went backwards at sample ${backwards}`);

    const checkpoints: Record<string, Probe> = {};
    for (const p of [0.8, 1]) {
      await scrub(page, p);
      await settle(page);
      checkpoints[p] = await probe(page);
      expect(checkpoints[p]!.frame === 191, `${label}: frame ${checkpoints[p]!.frame} at ${p}`);
    }
    report.checkpoints = checkpoints;

    const beats: string[] = [];
    for (const [index, [from, to]] of BEATS.entries()) {
      for (const [p, want] of [
        [from - 0.02, false],
        [(from + to) / 2, true],
        [to + 0.02, false],
      ] as const) {
        await scrub(page, p);
        await settle(page);
        const got = (await probe(page)).visible[index];
        beats.push(`${index}@${p.toFixed(2)}=${got}`);
        expect(got === want, `${label}: line ${index} visible=${got} at ${p.toFixed(2)}, want ${want}`);
      }
    }
    report.beats = beats;

    await scrub(page, 0.9);
    await settle(page);
    const landing = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>("[data-scene=sequence]")!;
      const targets = JSON.parse(section.dataset.targets ?? "{}") as Record<string, { x: number; y: number; width: number; height: number }>;
      return Object.entries(targets).map(([screen, target]) => {
        const card = document.querySelector<HTMLElement>(`[data-flagship="${screen}"]`)!;
        const rect = (card.querySelector<HTMLElement>("[data-poster]") ?? card).getBoundingClientRect();
        return { screen, dx: Math.abs(target.x - rect.left), dy: Math.abs(target.y - (rect.top + scrollY)), dw: Math.abs(target.width - rect.width), dh: Math.abs(target.height - rect.height) };
      });
    });
    const { phase, tiles } = await probe(page);
    report.landing = { phase, tiles, targets: landing };
    expect(tiles, `${label}: the tile layer never became ready`);
    expect(landing.length === 3, `${label}: ${landing.length} tile targets, want 3`);
    for (const target of landing) expect(Math.max(target.dx, target.dy, target.dw, target.dh) <= 1, `${label}: ${target.screen} target off by ${JSON.stringify(target)}`);
    expect(phase === "break", `${label}: phase ${phase} at 0.90`);
  }
  report.errors = errors;
  expect(!errors.length, `${label}: ${errors.length} console errors or failed requests`);
  await browser.close();
  return report;
};

const setSize = async (dir: string): Promise<Record<string, number>> => {
  const totals: Record<string, number> = {};
  for (const file of await readdir(dir, { recursive: true })) {
    const match = /^(light|dark)\/(1920|960|lq|screens)\/.*\.(avif|webp)$/.exec(file);
    if (!match) continue;
    const key = `${match[1]}/${match[2]}.${match[3]}`;
    totals[key] = (totals[key] ?? 0) + (await stat(join(dir, file))).size;
  }
  return totals;
};

try {
  const sizes = await setSize(join(root, "public/sequence"));
  for (const [key, bytes] of Object.entries(sizes)) {
    if (key.includes("/1920.")) expect(bytes < 6_000_000, `${key} is ${bytes} bytes`);
    if (key.includes("/960.")) expect(bytes < 2_500_000, `${key} is ${bytes} bytes`);
  }
  const reports = [await run({ width: 1440, height: 900 }), await run({ width: 390, height: 844 }), await run({ width: 1440, height: 900, reduced: true })];
  console.log(JSON.stringify({ sizes, reports, failures }, undefined, 2));
} finally {
  server.close();
}
process.exit(failures.length ? 1 : 0);
