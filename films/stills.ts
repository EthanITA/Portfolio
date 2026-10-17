import { cp, mkdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { REGIONS } from "../app/utils/play/regions.ts";
import { SAGE_SCRIPT } from "../app/utils/play/script/sage.ts";
import { SHELL_SCRIPT } from "../app/utils/play/script/shell.ts";
import { SIDECAR_SCRIPT } from "../app/utils/play/script/sidecar.ts";
import type { FeatureBeat } from "../app/utils/play/script/typed.ts";
import { ffmpeg } from "../tools/render/encode.ts";
import { Render } from "../tools/render/index.ts";

const PRODUCTS: Record<string, FeatureBeat[]> = { shell: SHELL_SCRIPT.beats, sage: SAGE_SCRIPT.beats, sidecar: SIDECAR_SCRIPT.beats };
const SCALES = [2, 3];
const MIN_PSNR = 42;

const root = resolve(import.meta.dirname, "..");
const work = join(root, "films/out/beats");
const staged = join(work, "public");
const out = join(root, "public/films/beats");

// Same BT.709 tagging as the posters, so the canvas colour decodes to the page's.
const TAGS = ["-vf", "scale=out_color_matrix=bt709:flags=lanczos", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1"];

type Encoded = { bytes: number; psnr: number; crf?: number };

type Still = { name: string; product: string; ms: number; width: number; height: number; sha256: string; avif: Encoded; webp: Encoded };

const psnr = async (a: string, b: string): Promise<number> => {
  const log = await ffmpeg(["-i", a, "-i", b, "-lavfi", "psnr", "-f", "null", "-"]);
  const average = /average:(inf|[\d.]+)/.exec(log)?.[1];
  return average === "inf" ? Infinity : Number(average);
};

const avif = async ({ source, target }: { source: string; target: string }): Promise<Encoded> => {
  for (let crf = 24; crf >= 0; crf -= 2) {
    await ffmpeg(["-i", source, ...TAGS, "-pix_fmt", "yuv444p", "-c:v", "libaom-av1", "-still-picture", "1", "-crf", String(crf), "-cpu-used", "4", "-row-mt", "1", "-f", "avif", "-frames:v", "1", target]);
    const db = await psnr(source, target);
    if (db >= MIN_PSNR) return { bytes: (await stat(target)).size, psnr: db, crf };
  }
  throw new Error(`${target} stays under ${MIN_PSNR} dB even at crf 0`);
};

const webp = async ({ source, target }: { source: string; target: string }): Promise<Encoded> => {
  await ffmpeg(["-i", source, "-c:v", "libwebp", "-lossless", "1", "-compression_level", "6", "-frames:v", "1", target]);
  const db = await psnr(source, target);
  if (db < MIN_PSNR) throw new Error(`${target} reads ${db} dB against its source`);
  return { bytes: (await stat(target)).size, psnr: db };
};

const server = await Render.serve({ route: "/film/play-shell", root });
try {
  await rm(work, { recursive: true, force: true });
  await mkdir(staged, { recursive: true });
  const stills: Still[] = [];
  for (const [product, beats] of Object.entries(PRODUCTS)) {
    for (const beat of beats) {
      const region = REGIONS[beat.id];
      if (!region) throw new Error(`${product}'s beat ${beat.id} has no region`);
      for (const scale of SCALES) {
        const name = `${beat.id}-${region.width * scale}`;
        const shoot = (pass: number) =>
          Render.still({ url: `${server.origin}/film/play-${product}`, dir: join(work, `${name}.${pass}`), ...region.frame, scale, ms: beat.moment, region: `[data-beat="${beat.id}"]` });
        const first = await shoot(0);
        const second = await shoot(1);
        const sha256 = first.hashes.get(0) ?? "";
        if (sha256 !== second.hashes.get(0)) throw new Error(`${name} at ${beat.moment} ms differs between two fresh pages`);
        if (first.width !== region.width * scale || first.height !== region.height * scale) throw new Error(`${name} came out ${first.width}x${first.height}`);
        const source = join(first.dir, Render.Frame.name(0));
        stills.push({
          name,
          product,
          ms: beat.moment,
          width: first.width,
          height: first.height,
          sha256: sha256.slice(0, 16),
          avif: await avif({ source, target: join(staged, `${name}.avif`) }),
          webp: await webp({ source, target: join(staged, `${name}.webp`) }),
        });
      }
    }
  }
  await rm(out, { recursive: true, force: true });
  await cp(staged, out, { recursive: true });
  console.log(JSON.stringify(stills, (_, value) => (value === Infinity ? "inf" : value), 2));
} finally {
  server.stop();
}
