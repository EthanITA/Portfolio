import { readFile, readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

import { type Browser, type BrowserContextOptions, type Page, chromium } from "playwright";

type Route = { path: string; h1?: [phone: number, desktop: number]; rhythm?: boolean; footer?: number; document?: boolean };
type Size = { name: "1440" | "390"; options: BrowserContextOptions; phone: boolean };
type Idle = { total: number; callbacks: { n: number; key: string }[]; scenes: string[]; demo: boolean; ticking: number; scrollY: number; running: number };
type Layout = {
  root: string;
  gap: number;
  h1: number;
  headings: { el: string; wrap: string }[];
  minor: { el: string; size: number }[];
  leads: { el: string; wrap: string; want: string }[];
  measures: { el: string; ratio: number }[];
  footerGap: number;
  overflow: number;
};
type Target = { el: string; size: number; owned: boolean };
type Sweep = {
  scrollTo: (top: number, settle: number) => Promise<void>;
  extent: () => { height: number; view: number };
  idle: (ms: number) => Promise<Idle>;
  entered: () => string[];
  visible: (share: number) => string[];
  counts: () => string[];
  stagger: () => { heading: string; words: number; total: number; step: number }[];
  layout: () => Layout;
  chip: () => { stuck: boolean; under: string[] }[];
  targets: () => Target[];
  junctions: () => string[];
  hoverMotion: () => string[];
};

const root = resolve(import.meta.dirname, "../..");
const site = join(root, ".output/public");
const helpers = join(import.meta.dirname, "page.js");

// Content plan section 7; the home's H1 follows the hero ruling of #445, its footer joins the contact band, and section 6 keeps the CV a document.
const ROUTES: Route[] = [
  { path: "/", h1: [36, 48], rhythm: true, footer: 0 },
  { path: "/sidecar", h1: [48, 60], rhythm: true, footer: 96 },
  { path: "/sage", h1: [48, 60], rhythm: true, footer: 96 },
  { path: "/shell", h1: [48, 60], rhythm: true, footer: 96 },
  { path: "/how", h1: [48, 60], rhythm: true, footer: 96 },
  { path: "/about", h1: [36, 48], rhythm: true, footer: 96 },
  { path: "/cv", document: true },
  { path: "/nope", h1: [36, 48] },
];
const SIZES: Size[] = [
  { name: "1440", options: { viewport: { width: 1440, height: 900 } }, phone: false },
  { name: "390", options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, phone: true },
];
const RHYTHM = { phone: 64, desktop: 96 };
const HEADING_XL = 24;
const MEASURE = 70;
const TARGET = 44;
// WCAG 2.5.8's floor, which the CV's contact line box (plan section 6) and the scenes' and playgrounds' own rulings sit on.
const TARGET_FLOOR = 24;
const WORDS_MS = 700;
const WORD_STEP_MS = 40;
const FRAME_MS = 17;
const SETTLE_MS = 3000;
const IDLE_MS = 1000;

const only = process.argv.slice(2).filter((arg) => arg.startsWith("/"));
const routes = only.length ? ROUTES.filter((route) => only.includes(route.path)) : ROUTES;

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

const failures: string[] = [];
const check = (ok: boolean, line: string): void => {
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
  if (!ok) failures.push(line);
};
const note = (line: string): void => console.log(`note ${line}`);
const list = (items: string[]): string => (items.length ? `: ${items.slice(0, 8).join(" | ")}${items.length > 8 ? ` and ${items.length - 8} more` : ""}` : "");

// Unknown paths answer with the prerendered 404 page, as Cloudflare Pages does.
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
  for (const candidate of [join(site, path), join(site, path, "index.html"), join(site, `${path}.html`)]) {
    const info = await stat(candidate).catch(() => undefined);
    if (!info?.isFile()) continue;
    response.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
    response.end(await readFile(candidate));
    return;
  }
  response.writeHead(404, { "content-type": "text/html" });
  response.end(await readFile(join(site, "404.html")));
});
await new Promise<void>((done) => server.listen(0, done));
const address = server.address();
const origin = `http://localhost:${typeof address === "object" && address ? address.port : 0}`;

const sweep = <T>(page: Page, call: (s: Sweep) => T | Promise<T>): Promise<T> =>
  page.evaluate(`(${call.toString()})(window.__sweep)`) as Promise<T>;

const open = async (browser: Browser, size: Size, path: string, extra: BrowserContextOptions = {}, words = false): Promise<Page> => {
  const context = await browser.newContext({ ...size.options, ...extra });
  if (words) await context.addInitScript("window.__sweepWords = true");
  await context.addInitScript({ path: helpers });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "load" });
  await page.evaluate("document.fonts.ready");
  await page.waitForTimeout(1500);
  return page;
};

// Steps a viewport at a time, three quarters of one, so every section gets a resting look.
const walk = async (page: Page, settle: number, each: (top: number) => Promise<void>): Promise<void> => {
  for (let top = 0; ; ) {
    await page.evaluate(`window.__sweep.scrollTo(${top}, ${settle})`);
    await each(top);
    const { height, view } = await sweep(page, (s) => s.extent());
    const end = height - view;
    if (top >= end) break;
    top = Math.min(end, top + Math.round(view * 0.75));
  }
};

const motion = async (browser: Browser, size: Size, route: Route): Promise<string[]> => {
  const label = `${route.path} ${size.name}`;
  const page = await open(browser, size, route.path);
  const busy: string[] = [];
  const dim: string[] = [];
  const covered: string[] = [];
  const stuck: string[] = [];
  let positions = 0;
  let loops = 0;
  await walk(page, SETTLE_MS, async () => {
    positions++;
    const idle = (await page.evaluate(`window.__sweep.idle(${IDLE_MS})`)) as Idle;
    const allowed = idle.scenes.length + (idle.demo ? 1 : 0);
    if (allowed && idle.total) loops++;
    if (idle.total && (!allowed || idle.callbacks.length > allowed))
      busy.push(`scrollY ${idle.scrollY} allowed ${idle.scenes.join("+") || "none"}${idle.demo ? "+demo" : ""}, anime ${idle.ticking}, ${idle.callbacks.map((c) => `${c.n}x ${c.key}`).join(" ; ")}`);
    dim.push(...(await sweep(page, (s) => s.visible(0.5))).map((el) => `scrollY ${idle.scrollY} ${el}`));
    for (const chip of await sweep(page, (s) => s.chip())) (chip.stuck ? stuck : covered).push(...chip.under.map((el) => `scrollY ${idle.scrollY} ${el}`));
  });
  check(!busy.length, `${label} rest: 0 rAF outside the hero, line and fence scenes and the playground demo at ${positions} positions (${loops} with an allowed loop live)${list(busy)}`);
  check(!dim.length, `${label} entrances: every entrance in view has landed after ${SETTLE_MS} ms${list(dim)}`);
  check(!(await sweep(page, (s) => s.entered())).length, `${label} end states: every entrance landed once the page was walked${list(await sweep(page, (s) => s.entered()))}`);
  check(!covered.length, `${label} chip: no playground element under the driver chip at rest in the bar${list(covered)}`);
  if (stuck.length) note(`${label} chip: with the bar stuck under the nav the chip rides over ${stuck.length} playground elements${list(stuck)}`);

  const layout = await sweep(page, (s) => s.layout());
  if (route.rhythm) {
    const want = size.phone ? RHYTHM.phone : RHYTHM.desktop;
    check(layout.gap === want, `${label} rhythm: ${layout.root} row-gap ${layout.gap} px, want ${want}`);
  }
  if (route.h1) {
    const want = size.phone ? route.h1[0] : route.h1[1];
    check(layout.h1 === want, `${label} H1: ${layout.h1} px, want ${want}`);
  }
  if (!route.document) {
    const unbalanced = layout.headings.filter((h) => h.wrap !== "balance").map((h) => `${h.el} ${h.wrap}`);
    check(!unbalanced.length, `${label} balance: ${layout.headings.length} H1 and section headings balance${list(unbalanced)}`);
    const minor = layout.minor.filter((h) => h.size !== HEADING_XL).map((h) => `${h.el} ${h.size} px`);
    check(!minor.length, `${label} beat and rule headings: ${layout.minor.length} at ${HEADING_XL} px${list(minor)}`);
    const plain = layout.leads.filter((p) => p.wrap !== p.want).map((p) => `${p.el} ${p.wrap}, want ${p.want}`);
    check(!plain.length, `${label} leads: ${layout.leads.length} leads wrap pretty, subtitles balance${list(plain)}`);
    const wide = layout.measures.filter((p) => p.ratio > MEASURE + 0.5).map((p) => `${p.el} ${p.ratio}`);
    check(!wide.length, `${label} measure: ${layout.measures.length} paragraphs at most ${MEASURE} half-ems${list(wide)}`);
  }

  await page.evaluate("window.__sweep.scrollTo(document.documentElement.scrollHeight, 1000)");
  const bottom = await sweep(page, (s) => s.layout());
  check(bottom.overflow <= 0, `${label} overflow: scrollWidth ${bottom.overflow > 0 ? `${bottom.overflow} px past` : "equals"} innerWidth at the bottom`);
  if (typeof route.footer === "number") check(Math.abs(bottom.footerGap - route.footer) < 1, `${label} footer: ${bottom.footerGap} px from the last section, want ${route.footer}`);

  const hover = await sweep(page, (s) => s.hoverMotion());
  check(!hover.length, `${label} hover: nothing moves on hover outside (hover: hover) and (pointer: fine)${list(hover)}`);

  const replay: string[] = [];
  await walk(page, 250, async () => {
    replay.push(...(await sweep(page, (s) => s.visible(0.5))));
  });
  check(!replay.length, `${label} once: walking back down replays no entrance${list(replay)}`);

  const counts = await sweep(page, (s) => s.counts());
  await page.context().close();
  return counts;
};

const reduced = async (browser: Browser, size: Size, route: Route): Promise<void> => {
  const label = `${route.path} ${size.name} reduced`;
  const page = await open(browser, size, route.path, { reducedMotion: "reduce" });
  const moving: string[] = [];
  const dim: string[] = [];
  let positions = 0;
  await walk(page, 600, async () => {
    positions++;
    const idle = await sweep(page, (s) => s.idle(600));
    if (idle.total || idle.running || idle.ticking) moving.push(`scrollY ${idle.scrollY} ${idle.total} rAF, ${idle.running} running, anime ${idle.ticking}`);
    dim.push(...(await sweep(page, (s) => s.visible(1))));
  });
  check(!moving.length, `${label}: nothing moves at ${positions} positions${list(moving)}`);
  check(!dim.length, `${label}: every section at its end state${list(dim)}`);
  await page.context().close();
};

// Sage's silence track ends empty, so a zero scale there is its end state.
const NO_JS = `(() => {
  const hidden = [];
  for (const el of document.querySelectorAll("main [data-enter], .fill:not([data-ends=silence])")) {
    const style = getComputedStyle(el);
    if (Number(style.opacity) < 0.999 || style.visibility === "hidden" || /^matrix\\(0,/.test(style.transform)) hidden.push(el.className + " " + (el.textContent || "").trim().slice(0, 40));
  }
  return { hidden, counts: [...document.querySelectorAll("[data-counter]")].map((el) => el.textContent || "") };
})()`;

const prerendered = async (browser: Browser, size: Size, route: Route, counts: string[]): Promise<void> => {
  const label = `${route.path} ${size.name} no JS`;
  const context = await browser.newContext({ ...size.options, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${origin}${route.path}`, { waitUntil: "load" });
  const html = (await page.evaluate(NO_JS)) as { hidden: string[]; counts: string[] };
  check(!html.hidden.length, `${label}: every entrance and bar at its end state in the prerendered HTML${list(html.hidden)}`);
  check(html.counts.join() === counts.join(), `${label}: the ${html.counts.length} numbers read as they land (${html.counts.join(", ")})`);
  await page.evaluate(await readFile(helpers, "utf8"));
  const joins = await sweep(page, (s) => s.junctions());
  check(!joins.length, `${label}: no two runs of text set apart on screen are joined in the text twins${list(joins)}`);
  await context.close();
};

const stagger = async (browser: Browser, route: Route): Promise<void> => {
  const page = await open(browser, SIZES[0]!, route.path, {}, true);
  await walk(page, 1500, async () => {});
  for (const h of await sweep(page, (s) => s.stagger())) {
    const ok = h.total <= WORDS_MS + FRAME_MS && (h.words < 2 || h.step <= WORD_STEP_MS + FRAME_MS);
    check(ok, `${route.path} words: "${h.heading}" ${h.words} words in ${h.total} ms, ${h.step} ms a word`);
  }
  await page.context().close();
};

const touch = async (browser: Browser, route: Route): Promise<void> => {
  const page = await open(browser, SIZES[1]!, route.path);
  await walk(page, 800, async () => {});
  const found = new Map<string, Target>();
  const read = async (): Promise<void> => {
    for (const target of await sweep(page, (s) => s.targets())) found.set(target.el, target);
  };
  await read();
  await page.evaluate(`(async () => { scrollTo({ top: 0, behavior: "instant" }); document.querySelector("header .menu")?.click(); await new Promise((r) => setTimeout(r, 500)); })()`);
  await read();
  const targets = [...found.values()];
  const want = route.document ? TARGET_FLOOR : TARGET;
  const small = targets.filter((t) => !t.owned && t.size < want - 0.5).map((t) => t.el);
  check(!small.length, `${route.path} 390 touch: ${targets.filter((t) => !t.owned).length} page targets at least ${want} px with the menu open${list(small)}`);
  const owned = targets.filter((t) => t.owned);
  const floor = owned.filter((t) => t.size < TARGET_FLOOR - 0.5).map((t) => t.el);
  if (owned.length) check(!floor.length, `${route.path} 390 touch: ${owned.length} scene and playground targets at least ${TARGET_FLOOR} px${list(floor)}`);
  const under = owned.filter((t) => t.size >= TARGET_FLOOR - 0.5 && t.size < TARGET - 0.5).map((t) => t.el);
  if (under.length) note(`${route.path} 390 touch: ${under.length} scene and playground targets between ${TARGET_FLOOR} and ${TARGET} px${list(under)}`);
  await page.context().close();
};

const CLASS = /\.(-?[A-Za-z_][\w-]*)/g;

// A scoped class named like a bare utility gets the utility too, because Tailwind finds the token in the template.
const collisions = async (): Promise<void> => {
  const app = join(root, "app");
  const components = (await readdir(app, { recursive: true })).filter((name) => name.endsWith(".vue")).map((name) => join(app, name));
  const ours = new Set<string>();
  for (const file of components) {
    const source = await readFile(file, "utf8");
    const styled = new Set([...source.matchAll(/<style[^>]*\bscoped\b[^>]*>([\s\S]*?)<\/style>/g)].flatMap((match) => [...match[1]!.matchAll(CLASS)].map((name) => name[1]!)));
    // Only a name the template writes itself picks up the bare rule; a scoped rule on a component's own root class (Kbd's .kbd) means to.
    for (const match of source.matchAll(/\sclass="([^"]*)"/g)) for (const name of match[1]!.split(/\s+/)) if (styled.has(name)) ours.add(name);
  }
  // Our own @utility names sit on their elements on purpose, and a scoped rule there extends them.
  const utilities = new Set([...(await readFile(join(app, "assets/css/main.css"), "utf8")).matchAll(/@utility\s+([\w-]+)/g)].map((match) => match[1]!));
  const files = (await readdir(join(site, "_nuxt"))).filter((name) => name.endsWith(".css")).map((name) => join(site, "_nuxt", name));
  const pages = (await readdir(site)).filter((name) => name.endsWith(".html")).map((name) => join(site, name));
  const sheets = await Promise.all(files.map((file) => readFile(file, "utf8")));
  const inline = await Promise.all(pages.map(async (page) => [...(await readFile(page, "utf8")).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n")));
  const css = [...sheets, ...inline].join("\n");
  const scoped = new Set([...css.matchAll(/\.(-?[A-Za-z_][\w-]*)\[data-v-[0-9a-f]+\]/g)].map((match) => match[1]!).filter((name) => ours.has(name) && !utilities.has(name)));
  const bare = new Set([...css.matchAll(/(?:^|[{};])\s*\.(-?[A-Za-z_][\w-]*)\s*\{/g)].map((match) => match[1]!));
  const both = [...scoped].filter((name) => bare.has(name)).sort();
  check(!both.length, `classes: ${scoped.size} scoped class names in app/, none also a bare rule in the generated CSS${list(both)}`);
};

const NOINDEX = new Set(["200.html", "404.html"]);

const robots = async (): Promise<void> => {
  const pages = (await readdir(site)).filter((name) => name.endsWith(".html"));
  const wrong: string[] = [];
  for (const page of pages) {
    const metas = [...(await readFile(join(site, page), "utf8")).matchAll(/<meta name="robots" content="([^"]*)"/g)].map((match) => match[1]!);
    const indexed = !metas[0]?.startsWith("noindex");
    if (metas.length !== 1 || indexed === NOINDEX.has(page)) wrong.push(`${page} ${metas.length ? metas.join(" + ") : "none"}`);
  }
  check(!wrong.length, `robots: ${pages.length} pages carry one robots meta, noindex only on ${[...NOINDEX].join(" and ")}${list(wrong)}`);
};

await collisions();
await robots();
const browser = await chromium.launch({ channel: "chromium" });
try {
  for (const size of SIZES) {
    const counts = await Promise.all(routes.map((route) => motion(browser, size, route)));
    await Promise.all(routes.map((route) => reduced(browser, size, route)));
    await Promise.all(routes.map((route, i) => prerendered(browser, size, route, counts[i]!)));
  }
  for (const route of routes) await stagger(browser, route);
  await Promise.all(routes.map((route) => touch(browser, route)));
} finally {
  await browser.close();
  server.close();
}

console.log(`${failures.length} failures over ${routes.length} routes at ${SIZES.map((size) => size.name).join(" and ")}`);
process.exit(failures.length ? 1 : 0);
