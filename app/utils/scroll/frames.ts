import { MANIFEST } from "./manifest.gen";
import { SEQUENCE, type Theme } from "./sequence";

export type FrameWidth = 1920 | 960;

export type FrameFormat = "avif" | "webp";

export type FrameSet = { theme: Theme; width: FrameWidth };

export type Drawable = { bitmap: ImageBitmap; index: number; floor: boolean };

export type Frames = {
  readonly set: FrameSet;
  readonly format: FrameFormat;
  best: (index: number) => Drawable | undefined;
  focus: (index: number) => void;
  loadFloor: () => Promise<void>;
  loadAll: () => Promise<void>;
  dispose: () => void;
};

export type FramesOptions = { set: FrameSet; onChange: () => void; ahead?: number; behind?: number };

const CONCURRENCY = 6;
const DECODES = 2;
const LAST = SEQUENCE.frames - 1;

const pad = (index: number): string => String(index).padStart(3, "0");

export const sequencePath = (path: string, format: FrameFormat): string => `/sequence/${path}.${format}?v=${MANIFEST.version}`;

const coarseToFine = (): number[] => {
  const order = [0, LAST];
  for (const stride of [8, 4, 2, 1]) {
    for (let index = 0; index < LAST; index += stride) if (!order.includes(index)) order.push(index);
  }
  return order;
};

const pool = async (indices: number[], work: (index: number) => Promise<void>): Promise<void> => {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < indices.length) await work(indices[next++]!);
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
};

// Decoded 1920 frames are 8 MB each, so only a window around the scroll position stays decoded and the rest stay compressed.
export const createFrames = ({ set, onChange, ahead = 8, behind = 4 }: FramesOptions): Frames => {
  const controller = new AbortController();
  const blobs = new Map<number, Blob>();
  const decoded = new Map<number, ImageBitmap>();
  const floor = new Map<number, ImageBitmap>();
  const decoding = new Set<number>();
  let format: FrameFormat = "avif";
  let focused = 0;
  let direction = 1;
  let wanted: number[] = [];

  const fetchBlob = async (path: string): Promise<Blob | undefined> => {
    for (let attempt = 0; attempt < 2 && !controller.signal.aborted; attempt++) {
      try {
        const response = await fetch(sequencePath(path, format), { signal: controller.signal });
        if (response.ok) return await response.blob();
      } catch {}
    }
  };

  const decode = async (blob: Blob): Promise<ImageBitmap | undefined> => {
    try {
      return await createImageBitmap(blob);
    } catch {}
  };

  const keep = (index: number): boolean => index === LAST || wanted.includes(index);

  const pump = (): void => {
    for (const index of [...wanted, LAST]) {
      if (decoding.size >= DECODES) return;
      const blob = blobs.get(index);
      if (!blob || decoded.has(index) || decoding.has(index)) continue;
      decoding.add(index);
      void decode(blob).then((bitmap) => {
        decoding.delete(index);
        if (!bitmap) return;
        if (controller.signal.aborted || !keep(index)) return bitmap.close();
        decoded.set(index, bitmap);
        onChange();
        pump();
      });
    }
  };

  const focus = (index: number): void => {
    if (index !== focused) direction = Math.sign(index - focused);
    focused = index;
    const [before, after] = direction > 0 ? [behind, ahead] : [ahead, behind];
    wanted = [index];
    for (let step = 1; step <= Math.max(before, after); step++) {
      if (step <= after && index + step * direction >= 0 && index + step * direction <= LAST) wanted.push(index + step * direction);
      if (step <= before && index - step * direction >= 0 && index - step * direction <= LAST) wanted.push(index - step * direction);
    }
    for (const [held, bitmap] of decoded) {
      if (keep(held)) continue;
      bitmap.close();
      decoded.delete(held);
    }
    pump();
  };

  const best = (index: number): Drawable | undefined => {
    for (let distance = 0; distance <= LAST; distance++) {
      for (const candidate of distance ? [index - distance, index + distance] : [index]) {
        const bitmap = decoded.get(candidate);
        if (bitmap) return { bitmap, index: candidate, floor: false };
        const low = floor.get(candidate);
        if (low) return { bitmap: low, index: candidate, floor: true };
      }
    }
  };

  const [first, ...rest] = MANIFEST.lq;
  let probe: Promise<void> | undefined;
  let floorLoad: Promise<void> | undefined;
  let allLoad: Promise<void> | undefined;

  const detect = (): Promise<void> =>
    (probe ??= (async () => {
      const avif = await fetchBlob(`${set.theme}/lq/${pad(first)}`);
      let bitmap = avif && (await decode(avif));
      if (!bitmap && !controller.signal.aborted) {
        format = "webp";
        const webp = await fetchBlob(`${set.theme}/lq/${pad(first)}`);
        bitmap = webp && (await decode(webp));
      }
      if (!bitmap) return;
      if (controller.signal.aborted) return bitmap.close();
      floor.set(first, bitmap);
      onChange();
    })());

  const loadFloor = (): Promise<void> => (floorLoad ??= fetchFloor());

  const loadAll = (): Promise<void> => (allLoad ??= fetchAll());

  const fetchFloor = async (): Promise<void> => {
    await detect();
    await pool(rest, async (index) => {
      const blob = await fetchBlob(`${set.theme}/lq/${pad(index)}`);
      const low = blob && (await decode(blob));
      if (!low) return;
      if (controller.signal.aborted) return low.close();
      floor.set(index, low);
      onChange();
    });
  };

  const fetchAll = async (): Promise<void> => {
    await detect();
    await pool(coarseToFine(), async (index) => {
      const blob = await fetchBlob(`${set.theme}/${set.width}/${pad(index)}`);
      if (!blob || controller.signal.aborted) return;
      blobs.set(index, blob);
      if (keep(index)) pump();
    });
  };

  const dispose = (): void => {
    controller.abort();
    for (const bitmap of [...decoded.values(), ...floor.values()]) bitmap.close();
    decoded.clear();
    floor.clear();
    blobs.clear();
  };

  return {
    set,
    get format() {
      return format;
    },
    best,
    focus,
    loadFloor,
    loadAll,
    dispose,
  };
};
