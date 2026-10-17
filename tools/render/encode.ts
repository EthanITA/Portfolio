import { spawn } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { dirname, extname, join } from "node:path";
import { Frame, type Frames } from "./frames.ts";

export const ffmpeg = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-nostdin", "-nostats", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let log = "";
    child.stderr.on("data", (chunk: Buffer) => {
      log += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(log) : reject(new Error(`ffmpeg ${args.join(" ")} exited ${code}\n${log.slice(-3000)}`))));
  });

const assertComplete = async (frames: Frames): Promise<void> => {
  const present = new Set(await readdir(frames.dir));
  const missing = Array.from({ length: frames.count }, (_, index) => index).filter((index) => !present.has(Frame.name(index)));
  if (missing.length) throw new Error(`${frames.dir} is missing ${missing.length} of ${frames.count} frames, first ${missing.slice(0, 5).join(", ")}`);
};

const seconds = (frames: Frames): number => frames.count / frames.fps;

const input = (frames: Frames): string[] => ["-framerate", String(frames.fps), "-start_number", "0", "-i", join(frames.dir, frames.pattern)];

// ffmpeg converts RGB with the BT.601 matrix unless told otherwise, which shifts the violet on every browser.
const BT709 = ["-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"];

const still = (width?: number): string[] => ["-vf", `scale=${width ?? -1}:-2:out_color_matrix=bt709:flags=lanczos`, "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1"];

const audioIn = ({ audio, frames }: { audio?: string; frames: Frames }): string[] =>
  audio ? ["-i", audio, "-map", "0:v", "-map", "1:a", "-af", "apad", "-t", seconds(frames).toFixed(6)] : ["-map", "0:v", "-an"];

export type VideoCodec = "h264" | "vp9" | "av1";

export type VideoOptions = { frames: Frames; out: string; codec: VideoCodec; audio?: string; budget?: number };

const AUDIO_KBPS: Record<VideoCodec, number> = { h264: 192, vp9: 128, av1: 128 };

const codecArgs = ({ codec, frames, kbps }: { codec: VideoCodec; frames: Frames; kbps?: number }): string[] => {
  const gop = String(frames.fps * 2);
  const cap = kbps ? ["-maxrate", `${kbps}k`, "-bufsize", `${kbps * 2}k`] : [];
  switch (codec) {
    case "h264":
      return ["-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", "18", ...cap, "-profile:v", "high", "-level:v", "4.2", "-g", gop, "-movflags", "+faststart", "-c:a", "aac", "-b:a", `${AUDIO_KBPS.h264}k`, "-ar", "48000"];
    case "vp9":
      return ["-c:v", "libvpx-vp9", "-crf", "30", "-b:v", kbps ? `${kbps}k` : "0", "-deadline", "good", "-cpu-used", "2", "-row-mt", "1", "-tile-columns", "2", "-g", gop, "-c:a", "libopus", "-b:a", `${AUDIO_KBPS.vp9}k`, "-ar", "48000"];
    case "av1":
      return ["-c:v", "libsvtav1", "-preset", "5", "-crf", "32", ...cap, "-g", gop, "-c:a", "libopus", "-b:a", `${AUDIO_KBPS.av1}k`, "-ar", "48000"];
  }
};

export const video = async ({ frames, out, codec, audio, budget }: VideoOptions): Promise<{ out: string; bytes: number }> => {
  await assertComplete(frames);
  await mkdir(dirname(out), { recursive: true });
  let kbps = budget ? Math.floor((budget * 8 * 0.92) / seconds(frames) / 1000 - (audio ? AUDIO_KBPS[codec] : 0)) : undefined;
  if (budget && (kbps ?? 0) < 100) throw new Error(`${budget} bytes leaves ${kbps} kbps for ${seconds(frames)} s of ${codec} video`);
  for (let attempt = 0; ; attempt++) {
    await ffmpeg([...input(frames), ...audioIn({ audio, frames }), ...BT709, "-r", String(frames.fps), ...codecArgs({ codec, frames, kbps }), out]);
    const { size } = await stat(out);
    if (!budget || size <= budget) return { out, bytes: size };
    if (attempt === 2 || !kbps) throw new Error(`${out} is ${size} bytes, over the ${budget} byte budget after ${attempt + 1} tries`);
    kbps = Math.floor(kbps * (budget / size) * 0.95);
  }
};

export const mux = async ({ video: source, audio, out, duration }: { video: string; audio: string; out: string; duration: number }): Promise<string> => {
  const codec = extname(out) === ".mp4" ? ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"] : ["-c:a", "libopus", "-b:a", "128k"];
  await ffmpeg(["-i", source, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", ...codec, "-ar", "48000", "-af", "apad", "-t", (duration / 1000).toFixed(6), out]);
  return out;
};

export type SequenceFormat = { format: "webp"; quality: number } | { format: "avif"; crf: number };

export type SequenceOptions = { frames: Frames; dir: string; width: number; step?: number } & SequenceFormat;

const pool = async <T>(items: T[], size: number, task: (item: T) => Promise<unknown>): Promise<void> => {
  const order = items.values();
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    for (const item of order) await task(item);
  }));
};

export const sequence = async (options: SequenceOptions): Promise<{ dir: string; count: number }> => {
  const { frames, dir, width, step = 1 } = options;
  await assertComplete(frames);
  await mkdir(dir, { recursive: true });
  const extension = `.${options.format}`;
  await Promise.all((await readdir(dir)).filter((file) => file.endsWith(extension)).map((file) => rm(join(dir, file))));
  const picked = Array.from({ length: Math.ceil(frames.count / step) }, (_, n) => n * step);
  const name = (n: number): string => join(dir, `${String(n).padStart(4, "0")}${extension}`);

  switch (options.format) {
    case "webp":
      await ffmpeg([...input(frames), "-vf", `select='not(mod(n\\,${step}))',scale=${width}:-2:flags=lanczos`, "-fps_mode", "passthrough", "-c:v", "libwebp", "-quality", String(options.quality), "-compression_level", "6", "-pix_fmt", "yuv420p", "-start_number", "0", join(dir, `%04d${extension}`)]);
      break;
    case "avif":
      // ffmpeg's image2 muxer writes bare AV1 packets, so every AVIF still is its own ffmpeg run.
      await pool(picked.map((index, n) => ({ index, n })), Math.max(1, Math.floor(availableParallelism() / 2)), ({ index, n }) =>
        ffmpeg(["-i", join(frames.dir, Frame.name(index)), ...still(width), "-pix_fmt", "yuv420p", "-c:v", "libaom-av1", "-still-picture", "1", "-crf", String(options.crf), "-cpu-used", "6", "-row-mt", "1", "-threads", "2", "-frames:v", "1", "-f", "avif", name(n)]),
      );
      break;
  }
  return { dir, count: picked.length };
};

export const poster = async ({ frames, index, out, width }: { frames: Frames; index: number; out: string; width?: number }): Promise<string> => {
  await mkdir(dirname(out), { recursive: true });
  const source = join(frames.dir, Frame.name(index));
  const codec: Record<string, string[]> = {
    ".jpg": ["-c:v", "mjpeg", "-q:v", "2", "-pix_fmt", "yuvj420p"],
    ".webp": ["-c:v", "libwebp", "-lossless", "1", "-compression_level", "6"],
    ".avif": ["-c:v", "libaom-av1", "-still-picture", "1", "-crf", "22", "-cpu-used", "4", "-pix_fmt", "yuv420p", "-f", "avif"],
    ".png": ["-c:v", "png"],
  };
  const args = codec[extname(out)];
  if (!args) throw new Error(`poster ${out}: use .jpg, .webp, .avif or .png`);
  await ffmpeg(["-i", source, ...still(width), ...args, "-frames:v", "1", out]);
  return out;
};
