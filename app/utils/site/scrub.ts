import { motionOn } from "./motion.ts";

// anime's 0.63 sync, 13 percent of the gap a frame at 60 fps, as a time constant the page's clock can keep.
const LAG_MS = 120;
// A quarter of a sequence frame, so a scrub lands no later than anime's nudged lerp brought it.
const SNAP = 0.001;

export type ScrubOptions = { goal: () => number; update: (progress: number) => void; from?: number };
export type Scrub = { wake: () => void; stop: () => void };

// The lag runs on the page's clock, so the frame after a long one catches up instead of parking short of the scroll.
export const useScrub = ({ goal, update, from }: ScrubOptions): Scrub => {
  const start = goal();
  // Seeded at the restored scroll unless told otherwise, so a reload mid-page doesn't replay the scrub.
  let progress = from ?? start;
  let frame = 0;
  let last = 0;
  let stopped = false;

  const step = (now: number): void => {
    frame = 0;
    const to = goal();
    progress = motionOn() ? to + (progress - to) * Math.exp(-(last ? now - last : 1000 / 60) / LAG_MS) : to;
    if (Math.abs(to - progress) < SNAP) progress = to;
    update(progress);
    last = progress === to ? 0 : now;
    if (last) frame = requestAnimationFrame(step);
  };

  const wake = (): void => {
    if (!frame && !stopped) frame = requestAnimationFrame(step);
  };

  const stop = (): void => {
    stopped = true;
    cancelAnimationFrame(frame);
    removeEventListener("scroll", wake);
    removeEventListener("resize", wake);
  };

  update(progress);
  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", wake);
  if (getCurrentScope()) onScopeDispose(stop);
  if (progress !== start) wake();
  return { wake, stop };
};
