import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Encode, Probe, Render, type Media, type Peak } from "../tools/render/index.ts";
import { mixProblems, readSheet, SHEETS } from "./scripts/cues.ts";
import { Grid } from "./scripts/grid.ts";
import sage from "./scripts/sage.ts";
import { FRAME, GRID, SAFE_MARGIN, WINDOW, type Cut, type FilmScript } from "./scripts/script.ts";
import shell from "./scripts/shell.ts";
import sidecar from "./scripts/sidecar.ts";

const SCRIPTS: Record<string, FilmScript> = { sidecar, sage, shell };
const CUTS: Record<string, { cut: Cut; suffix: string }> = {
  "16x9": { cut: "wide", suffix: "" },
  "4x5": { cut: "tall", suffix: "-4x5" },
};
const SCALE = 1.5;
const FPS = 60;
const BUDGET = 20_000_000;
// The treatment's own numbers, kept apart from the evaluators so the frames can disagree with them.
const CHECK = {
  placed: 200,
  px: 1,
  settle: 240,
  scale: 0.02,
  exact: 0.001,
  crossfade: 300,
  held: 250,
  near: 150,
  // A hit's loudest sample comes a few ms after its onset, so the loudest window may trail the beat.
  attack: 30,
} as const;

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

type Rect = { left: number; right: number; top: number; bottom: number };

type Placed = Rect & { name: string };

type Stamp = { name: string; at: number; leave: number; swell: boolean; group: number };

type Seen = { landed: string; sky: string; placed: Placed[]; movers: (Rect & { opacity: number })[]; glass: Rect & { opacity: number }; slab: string };

const report = ({ name, problems, passed }: { name: string; problems: string[]; passed: string }): Check[] =>
  problems.length ? problems.map((detail) => ({ name, pass: false, detail })) : [{ name, pass: true, detail: passed }];

const off = (a: Rect, b: Rect): number => Math.max(Math.abs(a.left - b.left), Math.abs(a.right - b.right), Math.abs(a.top - b.top), Math.abs(a.bottom - b.bottom));

const crosses = (a: Rect, b: Rect): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const stamps = async ({ url, cut }: { url: string; cut: Cut }): Promise<Stamp[]> => {
  const [first] = await Render.sample({
    url,
    ...FRAME[cut],
    scale: SCALE,
    times: [0],
    read: (): Stamp[] => {
      const elements = [...document.querySelectorAll<HTMLElement>(".film-sky [data-at], .film-title [data-at]")];
      const groups = [...new Set(elements.map((element) => (element.classList.contains("film-sky-word") ? element : element.parentElement)))];
      return elements.map((element) => {
        const word = element.closest(".film-title-word")?.querySelector("[data-text]") ?? element.closest(".film-sky-word") ?? element;
        const siblings = [...(element.parentElement?.children ?? [])].filter((sibling) => sibling.hasAttribute("data-at"));
        const letter = element.classList.contains("film-sky-word") ? "" : ` letter ${siblings.indexOf(element) + 1}`;
        return {
          name: `${element.closest(".film-title") ? ".film-title" : ".film-sky"} "${word.textContent?.trim()}"${letter}`,
          at: Number(element.dataset.at),
          leave: Number(element.dataset.leave),
          swell: element.dataset.swell === "true",
          group: groups.indexOf(element.classList.contains("film-sky-word") ? element : element.parentElement),
        };
      });
    },
  });
  return first?.value ?? [];
};

const fit = async ({ url, script, cut }: { url: string; script: FilmScript; cut: Cut }): Promise<Check[]> => {
  const { width, height } = FRAME[cut];
  const marks = await stamps({ url, cut });
  const rest = (stamp: Stamp): number => Math.min(stamp.leave, script.duration) - 1;
  const swells = [...Map.groupBy(marks.filter((stamp) => stamp.swell), (stamp) => stamp.group).values()].map((group) => {
    const letters = group.toSorted((a, b) => a.at - b.at);
    return { letters, beat: letters[0]?.at ?? 0, word: letters[0]?.name.replace(/ letter \d+$/, "") ?? "" };
  });
  const rippled = swells.filter(({ letters }) => letters.length >= 3);
  const frame = 1000 / FPS;
  const slabs = [script.rig.at ?? GRID.barMs, script.rig.until + CHECK.crossfade];
  const times = [
    ...new Set([
      ...Array.from({ length: script.duration / 100 }, (_, n) => n * 100),
      ...marks.flatMap((stamp) => [stamp.at + CHECK.placed, rest(stamp), ...(stamp.swell ? [stamp.at + CHECK.settle] : [])]),
      ...swells.map(({ beat }) => beat + CHECK.settle),
      ...rippled.map(({ beat }) => beat + frame),
      ...slabs,
    ]),
  ]
    .filter((ms) => ms >= 0 && ms < script.duration)
    .sort((a, b) => a - b);
  const samples = await Render.sample({
    url,
    width,
    height,
    scale: SCALE,
    times,
    read: (): Seen => {
      const glass = document.querySelector(".film-window");
      const box = glass?.getBoundingClientRect();
      let shown = glass ? 1 : 0;
      for (let node: Element | undefined = glass ?? undefined; node; node = node.parentElement ?? undefined) shown *= Number(getComputedStyle(node).opacity);
      return {
        landed: document.querySelector<HTMLElement>(".film-rig")?.dataset.landed ?? "",
        sky: document.querySelector<HTMLElement>(".film-sky")?.dataset.problems ?? "the frame has no .film-sky",
        placed: [
          ...[...document.querySelectorAll(".film-end")]
            .filter((element) => {
              let opacity = 1;
              for (let node: Element | undefined = element; node; node = node.parentElement ?? undefined) opacity *= Number(getComputedStyle(node).opacity);
              return opacity > 0.05;
            })
            .map((element) => ({ selector: ".film-end", element })),
          // A word's 0.4em travel crosses the margin only while it fades, so its place is read at rest.
          ...[
            { selector: ".film-sky", resting: ".film-sky [data-at]" },
            { selector: ".film-title", resting: ".film-title [data-at]" },
            { selector: ".film-sky-cap", resting: ".film-sky [data-cap]" },
          ].flatMap(({ selector, resting }) =>
            [...document.querySelectorAll<HTMLElement>(resting)].filter((element) => element.style.opacity === "1" && !element.style.transform).map((element) => ({ selector, element })),
          ),
        ].map(({ selector, element }) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const rect = selector === ".film-end" ? range.getBoundingClientRect() : element.getBoundingClientRect();
          return { name: `${selector} "${(element.closest(".film-sky-word") ?? element).textContent?.trim()}"`, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        }),
        movers: [...document.querySelectorAll<HTMLElement>(".film-sky [data-at], .film-title [data-at]")].map((element) => {
          const rect = element.getBoundingClientRect();
          return { opacity: Number(getComputedStyle(element).opacity), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        }),
        glass: { opacity: shown, left: box?.left ?? 0, right: box?.right ?? 0, top: box?.top ?? 0, bottom: box?.bottom ?? 0 },
        slab: document.querySelector<HTMLElement>("canvas[data-box]")?.dataset.box ?? "",
      };
    },
  });
  const seen = new Map(samples.map(({ ms, value }) => [ms, value]));
  const last = samples.at(-1)?.value;
  const landed = last?.landed.split(" ").map(Number) ?? [];
  const planned = report({ name: "sky", problems: last?.sky ? last.sky.split("\n") : [], passed: `${script.lines.length} lines planned` });
  const shots: Check[] = script.rig.shots.map((shot, index) => ({ name: `shot at ${shot.at} ms${shot.anchor ? ` on "${shot.anchor}"` : ""} lands`, pass: true, detail: `scale ${landed[index]?.toFixed(3)} of ${shot.scale}` }));

  const closest = new Map<string, { margin: number; ms: number }>();
  for (const { ms, value } of samples) {
    for (const placed of value.placed) {
      const margin = Math.min(placed.left, width - placed.right, placed.top, height - placed.bottom);
      const previous = closest.get(placed.name);
      if (!previous || margin < previous.margin) closest.set(placed.name, { margin, ms });
    }
  }
  const margins = [...closest].map(([name, { margin, ms }]) => ({ name: `${name} inside the frame`, pass: margin >= SAFE_MARGIN, detail: `${margin.toFixed(1)} px from the edge at ${ms} ms` }));

  let worst = 0;
  const early = marks.flatMap((stamp, index) => {
    const ms = stamp.at + CHECK.placed;
    const now = seen.get(ms)?.movers[index];
    const place = seen.get(rest(stamp))?.movers[index];
    if (!now || !place) return [`${stamp.name} was not sampled at ${ms} and ${rest(stamp)} ms`];
    worst = Math.max(worst, off(now, place));
    if (place.opacity !== 1) return [`${stamp.name} is at opacity ${place.opacity} at ${rest(stamp)} ms, its last moment before it leaves`];
    return now.opacity === 1 && off(now, place) <= CHECK.px ? [] : [`${stamp.name} at ${ms} ms is at opacity ${now.opacity.toFixed(3)} and ${off(now, place).toFixed(2)} px from its place`];
  });
  const placed = report({ name: `words in place ${CHECK.placed} ms after they start`, problems: early, passed: `${marks.length} of ${marks.length} at opacity 1, at most ${worst.toFixed(2)} px from their place` });

  const drift = ({ stamp, ms }: { stamp: Stamp; ms: number }): number => {
    const index = marks.indexOf(stamp);
    const now = seen.get(ms)?.movers[index];
    const place = seen.get(rest(stamp))?.movers[index];
    return now && place ? Math.abs((now.right - now.left) / (place.right - place.left) - 1) : Number.POSITIVE_INFINITY;
  };
  const settled = swells.map(({ letters, beat, word }) => {
    const onBeat = Math.max(...letters.map((stamp) => drift({ stamp, ms: beat + CHECK.settle })));
    const own = Math.max(...letters.map((stamp) => drift({ stamp, ms: stamp.at + CHECK.settle })));
    return {
      name: `${word} settles from its beat at ${beat}`,
      pass: onBeat <= CHECK.scale && own <= CHECK.exact,
      detail: `${(onBeat * 100).toFixed(2)} percent from its final scale at the beat + ${CHECK.settle}, and ${(own * 100).toFixed(3)} percent with each letter ${CHECK.settle} ms after its own start`,
    };
  });

  const ripples = rippled.map(({ letters, beat, word }) => {
    const shown = seen.get(beat + frame)?.movers ?? [];
    const [head] = letters;
    const tail = letters.at(-1);
    const first = head ? (shown[marks.indexOf(head)]?.opacity ?? 0) : 0;
    const last = tail ? (shown[marks.indexOf(tail)]?.opacity ?? 1) : 1;
    return { name: `${word} ripples in`, pass: first > 0 && !last, detail: `a frame after its beat at ${beat}, the first letter at opacity ${first.toFixed(3)} and the last at ${last.toFixed(3)}` };
  });

  const inside = new Map<string, { ms: number; depth: number }>();
  let up = 0;
  for (const { ms, value } of samples) {
    if (!value.glass.opacity) continue;
    up++;
    // Like the margin, the window is held against the resting layout, since a word rises onto the line through it while it fades in.
    for (const box of value.placed) {
      if (!crosses(box, value.glass)) continue;
      const depth = Math.min(box.bottom, value.glass.bottom) - Math.max(box.top, value.glass.top);
      if (depth > (inside.get(box.name)?.depth ?? 0)) inside.set(box.name, { ms, depth });
    }
  }
  const apart = report({
    name: "words off the window",
    problems: [...inside].map(([name, { ms, depth }]) => `${name} is ${depth.toFixed(1)} px into the window's box at ${ms} ms`),
    passed: `no word, keycap or end card at rest inside the window's box in ${up} samples with it up`,
  });

  const { x, y, width: across, height: tall } = WINDOW[cut];
  const slab = slabs.map((ms) => {
    const [left = Number.NaN, top = Number.NaN, right = Number.NaN, bottom = Number.NaN] = seen.get(ms)?.slab.split(" ").map(Number) ?? [];
    const gap = off({ left, top, right, bottom }, { left: x, top: y, right: x + across, bottom: y + tall });
    return { name: `island slab on the window at ${ms} ms`, pass: gap <= CHECK.px, detail: `${left} ${top} ${right} ${bottom}, ${gap.toFixed(2)} px from the window's box` };
  });

  return [...planned, ...shots, ...margins, ...placed, ...settled, ...ripples, ...apart, ...slab];
};

const beats = (script: FilmScript): number[] => Array.from({ length: script.close / GRID.beatMs + 1 }, (_, n) => n * GRID.beatMs);

const frameAt = (ms: number): number => Math.round((ms * FPS) / 1000);

const held = ({ script, hashes }: { script: FilmScript; hashes: Map<number, string> }): Check[] => {
  const still = beats(script).filter((ms) => !hashes.get(frameAt(ms)) || hashes.get(frameAt(ms)) === hashes.get(frameAt(ms + CHECK.held)));
  return report({
    name: `every beat moves within ${CHECK.held} ms`,
    problems: still.map((ms) => `the frame at ${ms} ms is the frame at ${ms + CHECK.held}`),
    passed: `${beats(script).length} beats from 0 to ${script.close} ms each differ from ${CHECK.held} ms later`,
  });
};

const sound = async ({ script, mix }: { script: FilmScript; mix: string }): Promise<Check[]> => {
  const { sampleRate, samples } = await Probe.audio(mix);
  const frames = (samples * FPS) / sampleRate;
  const peaks = await Probe.peaks(mix, { from: script.close - CHECK.near, to: script.close + CHECK.near, window: 10 });
  const loudest = peaks.reduce<Peak | undefined>((best, peak) => (!best || peak.level > best.level ? peak : best), undefined);
  const at = Math.round(loudest?.at ?? Number.NaN);
  return [
    { name: "mix length", pass: frames === (script.duration * FPS) / 1000, detail: `${frames} frames at ${sampleRate} Hz` },
    { name: "closing hit", pass: at >= script.close && at <= script.close + CHECK.attack, detail: `the loudest 10 ms within ${CHECK.near} ms of the close at ${script.close} starts at ${at} ms, ${loudest?.level} dBFS` },
  ];
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
  if (audio) {
    const loudness = await Probe.loudness(master);
    expect("integrated loudness", Math.abs(loudness.integrated + 16) <= 1, `${loudness.integrated} LUFS`);
    expect("true peak", loudness.truePeak < -1, `${loudness.truePeak} dBTP`);
  }
  return checks;
};

const film = async (name: string): Promise<boolean> => {
  const script = SCRIPTS[name];
  const shape = CUTS[values.cut];
  if (!script || !shape) throw new Error(`usage: tsx films/render.ts <${Object.keys(SCRIPTS).join("|")}...> [--cut ${Object.keys(CUTS).join("|")}] [--fit]`);
  const { cut, suffix } = shape;
  const { width, height } = FRAME[cut];

  const mix = join(root, "films/audio", name, "mix.wav");
  const audio = existsSync(mix) ? mix : undefined;
  const mixSha256 = audio ? createHash("sha256").update(await readFile(audio)).digest("hex") : "no mix.wav";
  const json = SHEETS[script.name];
  const sheet = [
    ...report({
      name: "timing sheet",
      problems: [...mixProblems({ json, mixSha256 }), ...readSheet({ script, json }).problems],
      passed: `${script.lines.length} lines on the ${GRID.bpm} bpm grid, closing at ${script.close} ms`,
    }),
    ...report({ name: "grid", problems: Grid.offGrid(script), passed: `every mark, play moment, key and camera move on the ${GRID.beatMs} ms grid` }),
    ...(audio ? await sound({ script, mix: audio }) : []),
  ];
  if (sheet.some((check) => !check.pass) && !values.fit) {
    console.log(JSON.stringify({ film: `${name}${suffix}`, misplaced: sheet.filter((check) => !check.pass) }, undefined, 2));
    return false;
  }

  const route = `/film/${name}`;
  const server = await Render.serve({ route, port: values.port ? Number(values.port) : undefined, root });
  try {
    const started = performance.now();
    const options = { url: `${server.origin}${route}`, width, height, scale: SCALE, fps: FPS };
    const placement = [...sheet, ...(await fit({ url: options.url, script, cut }))];
    const out = join(root, "films/out", `${name}${suffix}`);
    if (values.fit) {
      const only = [...new Set(beats(script).flatMap((ms) => [frameAt(ms), frameAt(ms + CHECK.held)]))];
      const sampled = await Render.frames({ ...options, dir: join(out, "held"), only });
      const checks = [...placement, ...held({ script, hashes: sampled.hashes })];
      const failed = checks.filter((check) => !check.pass);
      console.log(JSON.stringify({ film: `${name}${suffix}`, placement: checks, failed: failed.length }, undefined, 2));
      return !failed.length;
    }
    const misplaced = placement.filter((check) => !check.pass);
    if (misplaced.length) {
      console.log(JSON.stringify({ film: `${name}${suffix}`, misplaced }, undefined, 2));
      return false;
    }
    const frames = await Render.frames({
      ...options,
      dir: join(out, "frames"),
      onProgress: (done, total) => {
        if (done % 300 === 0 || done === total) console.error(`${name}${suffix} ${done}/${total}`);
      },
    });
    const mismatches = await Render.check({ ...options, frames, samples: Number(values.check) });
    if (mismatches.length) throw new Error(`${name} is not deterministic: ${JSON.stringify(mismatches)}`);

    const base = join(root, "public/films", `${name}${suffix}`);
    const files = [];
    for (const [codec, extension] of [["h264", "mp4"], ["vp9", "webm"]] as const) {
      files.push((await Encode.video({ frames, codec, out: `${base}.${extension}`, audio, budget: BUDGET })).out);
    }
    const index = frameAt(script.poster);
    const posters = await Promise.all([".jpg", ".webp"].map((extension) => Encode.poster({ frames, index, out: `${base}-poster${extension}` })));

    const checks = [...placement, ...held({ script, hashes: frames.hashes }), ...(await verify({ script, files, width: frames.width, height: frames.height, audio: Boolean(audio) }))];
    const failed = checks.filter((check) => !check.pass);
    console.log(JSON.stringify({ film: `${name}${suffix}`, seconds: Math.round((performance.now() - started) / 1000), frames: frames.count, audio: audio ?? "none", files, posters, checks, failed: failed.length }, undefined, 2));
    return !failed.length;
  } finally {
    server.stop();
  }
};

let ok = true;
for (const name of positionals) ok = (await film(name)) && ok;
process.exit(ok ? 0 : 1);
