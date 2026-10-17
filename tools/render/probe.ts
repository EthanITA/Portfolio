import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ffmpeg } from "./encode.ts";

export type Media = {
  file: string;
  bytes: number;
  seconds: number;
  width: number;
  height: number;
  fps: number;
  frames: number;
  video: string;
  pixFmt: string;
  colorSpace?: string;
  videoSeconds?: number;
  audio?: string;
  audioSeconds?: number;
  sampleRate?: number;
  channels?: number;
};

export type Stretch = { start: number; end: number; seconds: number };

export type Loudness = { integrated: number; truePeak: number; range: number };

type FfprobeStream = {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  nb_read_frames?: string;
  pix_fmt?: string;
  color_space?: string;
  sample_rate?: string;
  channels?: number;
  duration?: string;
  tags?: { DURATION?: string };
};

// MP4 reports a stream's duration in seconds, while WebM only carries it as an HH:MM:SS tag.
const streamSeconds = (stream: FfprobeStream): number | undefined => {
  if (stream.duration) return Number(stream.duration);
  const [hours = 0, minutes = 0, seconds = 0] = stream.tags?.DURATION?.split(":").map(Number) ?? [];
  return stream.tags?.DURATION ? hours * 3600 + minutes * 60 + seconds : undefined;
};

const rate = (fraction = "0/1"): number => {
  const [num = 0, den = 1] = fraction.split("/").map(Number);
  return den ? num / den : 0;
};

export const media = async (file: string): Promise<Media> => {
  const { stdout } = await promisify(execFile)("ffprobe", ["-v", "error", "-count_frames", "-print_format", "json", "-show_format", "-show_streams", file], { maxBuffer: 1 << 24 });
  const parsed = JSON.parse(stdout) as { format: { size: string; duration: string }; streams: FfprobeStream[] };
  const video = parsed.streams.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams.find((stream) => stream.codec_type === "audio");
  if (!video) throw new Error(`${file} has no video stream`);
  return {
    file,
    bytes: Number(parsed.format.size),
    seconds: Number(parsed.format.duration),
    width: video.width ?? 0,
    height: video.height ?? 0,
    fps: rate(video.avg_frame_rate),
    frames: Number(video.nb_read_frames ?? 0),
    video: video.codec_name,
    pixFmt: video.pix_fmt ?? "",
    colorSpace: video.color_space,
    videoSeconds: streamSeconds(video),
    audio: audio?.codec_name,
    audioSeconds: audio ? streamSeconds(audio) : undefined,
    sampleRate: audio?.sample_rate ? Number(audio.sample_rate) : undefined,
    channels: audio?.channels,
  };
};

const stretches = (log: string, pattern: RegExp): Stretch[] =>
  [...log.matchAll(pattern)].map(([, start = "0", end = "0"]) => ({ start: Number(start), end: Number(end), seconds: Number(end) - Number(start) }));

export const black = async (file: string, { seconds = 0.1, threshold = 0.1 }: { seconds?: number; threshold?: number } = {}): Promise<Stretch[]> =>
  stretches(await ffmpeg(["-i", file, "-vf", `blackdetect=d=${seconds}:pix_th=${threshold}`, "-an", "-f", "null", "-"]), /black_start:([\d.]+) black_end:([\d.]+)/g);

export const frozen = async (file: string, { seconds = 0.5, noise = "-60dB" }: { seconds?: number; noise?: string } = {}): Promise<Stretch[]> => {
  const log = await ffmpeg(["-i", file, "-vf", `freezedetect=n=${noise}:d=${seconds}`, "-an", "-f", "null", "-"]);
  const starts = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map(([, at = "0"]) => Number(at));
  const ends = [...log.matchAll(/freeze_end: ([\d.]+)/g)].map(([, at = "0"]) => Number(at));
  const { seconds: length } = await media(file);
  return starts.map((start, n) => {
    const end = ends[n] ?? length;
    return { start, end, seconds: end - start };
  });
};

export type Band = { at: number; low: number; high: number; spread: number };

export const band = async (file: string, { at, top = 2 / 3 }: { at: number[]; top?: number }): Promise<Band[]> =>
  Promise.all(
    at.map(async (seconds) => {
      const log = await ffmpeg(["-ss", seconds.toFixed(3), "-i", file, "-frames:v", "1", "-vf", `crop=iw:ih*${1 - top}:0:ih*${top},signalstats,metadata=print`, "-an", "-f", "null", "-"]);
      const read = (key: string): number => Number(log.match(new RegExp(`lavfi\\.signalstats\\.${key}=([\\d.]+)`))?.[1] ?? Number.NaN);
      // YLOW and YHIGH are the 10th and 90th percentiles, and a caption covers too little of the band to move them.
      const low = read("YMIN");
      const high = read("YMAX");
      return { at: seconds, low, high, spread: high - low };
    }),
  );

export const loudness = async (file: string): Promise<Loudness> => {
  const log = await ffmpeg(["-i", file, "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]);
  const summary = log.slice(log.lastIndexOf("Summary:"));
  const read = (pattern: RegExp): number => Number(summary.match(pattern)?.[1] ?? Number.NaN);
  return { integrated: read(/I:\s+(-?[\d.]+) LUFS/), truePeak: read(/Peak:\s+(-?[\d.]+) dBFS/), range: read(/LRA:\s+(-?[\d.]+) LU/) };
};
