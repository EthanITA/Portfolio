import { motionOn } from "./motion.ts";

// anime's 0.63 sync, 13 percent of the gap a frame at 60 fps, as a time constant the page's clock can keep.
const LAG_MS = 120;
// A quarter of a sequence frame, so a scrub lands no later than anime's nudged lerp brought it.
const SNAP = 0.001;

export type ScrubOptions = { goal: () => number; update: (progress: number) => void };
export type Scrub = { wake: () => void; stop: () => void };

// The lag runs on the page's clock, so the frame after a long one catches up instead of parking short of the scroll.
export const useScrub = ({ goal, update }: ScrubOptions): Scrub => {
  // Seeding at the restored scroll keeps the smoothing from replaying the scrub on a reload mid-page.
  let progress = goal();
  let frame = 0;
  let last = 0;
  let stopped = false;

  const step = (now: number): void => {
    frame = 0;
    const to = goal();
    const was = progress;
    progress = motionOn() ? to + (progress - to) * Math.exp(-(last ? now - last : 1000 / 60) / LAG_MS) : to;
    if (Math.abs(to - progress) < SNAP) progress = to;
    // Scrolls above or below the range wake it too, and they must cost no style writes.
    if (progress !== was) update(progress);
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
  return { wake, stop };
};
