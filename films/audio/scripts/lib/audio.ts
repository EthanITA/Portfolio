import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const SAMPLE_RATE = 48000;
export const FFMPEG = "/opt/homebrew/bin/ffmpeg";
export const FFPROBE = "/opt/homebrew/bin/ffprobe";

export type Stereo = { l: Float32Array; r: Float32Array };

export type Loudness = { integrated: number; truePeak: number; range: number };

export const samplesAt = (ms: number): number => Math.round((ms * SAMPLE_RATE) / 1000);

export const msAt = (samples: number): number => (samples * 1000) / SAMPLE_RATE;

export const blank = (samples: number): Stereo => ({
  l: new Float32Array(samples),
  r: new Float32Array(samples),
});

export const toDb = (x: number): number => 20 * Math.log10(Math.max(x, 1e-12));

export const fromDb = (db: number): number => 10 ** (db / 20);

export const run = (cmd: string, args: string[], input?: Buffer): Promise<{ out: Buffer; err: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => out.push(c));
    child.stderr.on("data", (c: Buffer) => err.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      const stderr = Buffer.concat(err).toString();
      if (code) reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-2000)}`));
      else resolve({ out: Buffer.concat(out), err: stderr });
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(input);
  });

export const decode = async (file: string): Promise<Stereo> => {
  const { out } = await run(FFMPEG, [
    "-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(SAMPLE_RATE), "pipe:1",
  ]);
  const all = new Float32Array(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
  const n = all.length / 2;
  const s = blank(n);
  for (let i = 0; i < n; i++) {
    s.l[i] = all[2 * i]!;
    s.r[i] = all[2 * i + 1]!;
  }
  return s;
};

export const decodeMono = async (file: string): Promise<Float32Array> => {
  const { out } = await run(FFMPEG, [
    "-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SAMPLE_RATE), "pipe:1",
  ]);
  return new Float32Array(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
};

export const peakOf = (s: Stereo): number => {
  let p = 0;
  for (let i = 0; i < s.l.length; i++) p = Math.max(p, Math.abs(s.l[i]!), Math.abs(s.r[i]!));
  return p;
};

export const writeWav24 = async (file: string, s: Stereo): Promise<void> => {
  if (peakOf(s) > 1) throw new Error(`refusing to write ${file}: sample peak ${toDb(peakOf(s)).toFixed(2)} dBFS is over full scale`);
  const n = s.l.length;
  const data = Buffer.alloc(n * 6);
  for (let i = 0; i < n; i++) {
    data.writeIntLE(Math.round(s.l[i]! * 8388607), i * 6, 3);
    data.writeIntLE(Math.round(s.r[i]! * 8388607), i * 6 + 3, 3);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SAMPLE_RATE, 24);
  head.writeUInt32LE(SAMPLE_RATE * 6, 28);
  head.writeUInt16LE(6, 32);
  head.writeUInt16LE(24, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.concat([head, data]));
};

export const encodeFlac = async (wav: string, flac: string): Promise<void> => {
  await run(FFMPEG, [
    "-y", "-v", "error", "-i", wav, "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
    "-c:a", "flac", "-compression_level", "8", flac,
  ]);
};

export const measure = async (file: string): Promise<Loudness> => {
  const { err } = await run(FFMPEG, [
    "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-",
  ]);
  const summary = err.slice(err.lastIndexOf("Summary:"));
  const grab = (label: RegExp): number => {
    const m = summary.match(label);
    if (!m) throw new Error(`ebur128 summary missing ${label}\n${summary}`);
    return Number(m[1]);
  };
  return {
    integrated: grab(/I:\s+(-?[\d.]+) LUFS/),
    range: grab(/LRA:\s+(-?[\d.]+) LU/),
    truePeak: grab(/Peak:\s+(-?[\d.]+) dBFS/),
  };
};

export const durationOf = async (file: string): Promise<number> => {
  const { out } = await run(FFPROBE, [
    "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "default=nw=1:nk=1", file,
  ]);
  return Number(out.toString().trim()) * 1000;
};
