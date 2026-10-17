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

export type Sound = { sampleRate: number; samples: number };

export const audio = async (file: string): Promise<Sound> => {
  const { stdout } = await promisify(execFile)("ffprobe", ["-v", "error", "-select_streams", "a:0", "-print_format", "json", "-show_streams", file]);
  const [stream] = (JSON.parse(stdout) as { streams: { sample_rate?: string; duration_ts?: number }[] }).streams;
  if (!stream?.sample_rate || !stream.duration_ts) throw new Error(`${file} has no audio stream with a sample count`);
  return { sampleRate: Number(stream.sample_rate), samples: stream.duration_ts };
};

export type Peak = { at: number; level: number };

// astats resets on every window, so each level is the loudest sample inside that window alone.
export const peaks = async (file: string, { from, to, window }: { from: number; to: number; window: number }): Promise<Peak[]> => {
  const { sampleRate } = await audio(file);
  const length = Math.round((window / 1000) * sampleRate);
  const log = await ffmpeg([
    "-ss",
    (from / 1000).toFixed(6),
    "-t",
    ((to - from) / 1000).toFixed(6),
    "-i",
    file,
    "-af",
    `asetnsamples=n=${length}:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level`,
    "-f",
    "null",
    "-",
  ]);
  return [...log.matchAll(/pts_time:([\d.]+)[\s\S]*?lavfi\.astats\.Overall\.Peak_level=(-?[\d.]+|-inf)/g)].map(([, at = "0", level = "-inf"]) => ({
    at: from + Number(at) * 1000,
    level: level === "-inf" ? Number.NEGATIVE_INFINITY : Number(level),
  }));
};

export const loudness = async (file: string): Promise<Loudness> => {
  const log = await ffmpeg(["-i", file, "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]);
  const summary = log.slice(log.lastIndexOf("Summary:"));
  const read = (pattern: RegExp): number => Number(summary.match(pattern)?.[1] ?? Number.NaN);
  return { integrated: read(/I:\s+(-?[\d.]+) LUFS/), truePeak: read(/Peak:\s+(-?[\d.]+) dBFS/), range: read(/LRA:\s+(-?[\d.]+) LU/) };
};
