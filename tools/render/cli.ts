import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Encode, Probe, Render, type SequenceFormat, type VideoCodec } from "./index.ts";

const root = resolve(import.meta.dirname, "../..");

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    size: { type: "string", default: "1920x1080" },
    scale: { type: "string", default: "1" },
    fps: { type: "string", default: "60" },
    from: { type: "string", default: "0" },
    to: { type: "string" },
    workers: { type: "string" },
    port: { type: "string" },
    out: { type: "string" },
    check: { type: "string", default: "0" },
    mp4: { type: "string" },
    webm: { type: "string" },
    av1: { type: "string" },
    audio: { type: "string" },
    budget: { type: "string" },
    poster: { type: "string", multiple: true, default: [] },
    "poster-at": { type: "string", default: "0" },
    sequence: { type: "string", multiple: true, default: [] },
    step: { type: "string", default: "1" },
    band: { type: "string" },
  },
});

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const probe = async (files: string[]): Promise<void> => {
  for (const file of files) {
    const info = await Probe.media(file);
    const at = values.band?.split(",").map(Number);
    const report = {
      ...info,
      black: await Probe.black(file),
      frozen: await Probe.frozen(file),
      loudness: info.audio ? await Probe.loudness(file) : undefined,
      band: at ? await Probe.band(file, { at }) : undefined,
    };
    console.log(JSON.stringify(report, undefined, 2));
  }
};

const sequenceSpec = (spec: string): { width: number; dir?: string } & SequenceFormat => {
  const [format, width, quality, dir] = spec.split(":");
  if (format === "webp") return { format, width: Number(width), quality: Number(quality), dir };
  if (format === "avif") return { format, width: Number(width), crf: Number(quality), dir };
  return fail(`--sequence ${spec}: use webp:<width>:<quality 0-100>[:dir] or avif:<width>:<crf 0-63>[:dir]`);
};

const render = async (route: string): Promise<void> => {
  const [, width = 0, height = 0] = values.size.match(/^(\d+)x(\d+)$/)?.map(Number) ?? [];
  const scale = Number(values.scale);
  const fps = Number(values.fps);
  if (!width || !height) fail(`--size ${values.size}: use <width>x<height>`);
  if (Math.round(width * scale) % 2 || Math.round(height * scale) % 2) fail(`${width * scale}x${height * scale} is odd; yuv420p needs even output dimensions`);

  const { pathname, search } = new URL(route, "http://film");
  const name = [basename(pathname), ...search.slice(1).split(/[^\w]+/).filter(Boolean)].join("-");
  const out = resolve(values.out ?? join(root, "films/out", name));
  const server = await Render.serve({ route, port: values.port ? Number(values.port) : undefined, root });
  const started = performance.now();
  let reported = 0;
  const options = {
    url: `${server.origin}${route}`,
    width,
    height,
    scale,
    fps,
    from: Number(values.from),
    to: values.to ? Number(values.to) : undefined,
    workers: values.workers ? Number(values.workers) : undefined,
    onProgress: (done: number, total: number) => {
      if (done !== total && performance.now() - reported < 2000) return;
      reported = performance.now();
      const seconds = (reported - started) / 1000;
      console.error(`${name} ${done}/${total} frames, ${(done / seconds).toFixed(1)} frames/s`);
    },
  };

  try {
    const frames = await Render.frames({ ...options, dir: join(out, "frames") });
    const renderSeconds = (performance.now() - started) / 1000;
    const mismatches = Number(values.check) ? await Render.check({ ...options, onProgress: undefined, frames, samples: Number(values.check) }) : [];
    if (mismatches.length) fail(`not deterministic:\n${JSON.stringify(mismatches, undefined, 2)}`);

    const budget = values.budget ? Number(values.budget) * 1_000_000 : undefined;
    const videos: [VideoCodec, string | undefined][] = [["h264", values.mp4], ["vp9", values.webm], ["av1", values.av1]];
    const encoded = [];
    for (const [codec, file] of videos) {
      if (!file) continue;
      const result = await Encode.video({ frames, codec, out: resolve(file), audio: values.audio && resolve(values.audio), budget });
      encoded.push(await Probe.media(result.out));
    }

    const posterIndex = Math.round(((Number(values["poster-at"]) - frames.from) * fps) / 1000);
    if (values.poster.length && (posterIndex < 0 || posterIndex >= frames.count)) fail(`--poster-at ${values["poster-at"]} is outside the rendered range`);
    const posters = await Promise.all(values.poster.map((file) => Encode.poster({ frames, index: posterIndex, out: resolve(file) })));

    const sequences = [];
    for (const spec of values.sequence) {
      const { dir, ...format } = sequenceSpec(spec);
      sequences.push(await Encode.sequence({ frames, step: Number(values.step), ...format, dir: resolve(dir ?? join(out, `${format.format}-${format.width}`)) }));
    }

    console.log(
      JSON.stringify(
        {
          route,
          frames: { dir: frames.dir, count: frames.count, fps, size: `${frames.width}x${frames.height}`, seconds: Number(renderSeconds.toFixed(1)), perSecond: Number((frames.count / renderSeconds).toFixed(1)) },
          check: Number(values.check) ? { samples: Number(values.check), mismatches: 0 } : undefined,
          videos: encoded,
          posters,
          sequences,
        },
        undefined,
        2,
      ),
    );
  } finally {
    server.stop();
  }
};

const [command = "", ...rest] = positionals;
if (command === "probe") await probe(rest);
else if (command.startsWith("/")) await render(command);
else fail("usage: tsx tools/render/cli.ts <route> [options] | probe <file...>");
