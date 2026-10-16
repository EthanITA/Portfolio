import { MOTION_EASE } from "@cela/design/utils/motion";
import type { Shot } from "../scripts/script.ts";

export type View = { x: number; y: number; scale: number };

const IDENTITY: View = { x: 0, y: 0, scale: 1 };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const axis = ({ center, scale, size }: { center: number; scale: number; size: number }): number =>
  scale * size >= size ? clamp(size / 2 - scale * center, size - scale * size, 0) : (size - scale * size) / 2;

// Measured now, in the rig's own coordinates, so a shot follows the anchor wherever the product has moved it at this ms.
const frame = ({ shot, rig }: { shot: Shot; rig: HTMLElement }): View => {
  const width = rig.offsetWidth;
  const height = rig.offsetHeight;
  const anchor = shot.anchor ? rig.querySelector(`[data-film-anchor="${shot.anchor}"]`) : undefined;
  let center = { x: width / 2, y: height / 2 };
  if (anchor) {
    const box = rig.getBoundingClientRect();
    const target = anchor.getBoundingClientRect();
    const current = box.width / width;
    center = { x: (target.left + target.width / 2 - box.left) / current, y: (target.top + target.height / 2 - box.top) / current };
  }
  return { x: axis({ center: center.x, scale: shot.scale, size: width }), y: axis({ center: center.y, scale: shot.scale, size: height }), scale: shot.scale };
};

const view = ({ shots, ms, rig }: { shots: Shot[]; ms: number; rig: HTMLElement }): View => {
  const index = shots.findLastIndex((shot) => shot.at <= ms);
  const shot = shots[index];
  if (!shot) return IDENTITY;
  const previous = shots[index - 1];
  const start = previous ? frame({ shot: previous, rig }) : IDENTITY;
  const end = frame({ shot, rig });
  const progress = shot.duration ? MOTION_EASE.inOut(clamp((ms - shot.at) / shot.duration, 0, 1)) : 1;
  return { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress, scale: start.scale + (end.scale - start.scale) * progress };
};

const assertSequential = (shots: Shot[]): void => {
  shots.forEach((shot, index) => {
    const previous = shots[index - 1];
    if (previous && shot.at < previous.at + previous.duration) throw new Error(`shot at ${shot.at} ms starts before the one at ${previous.at} ms ends`);
  });
};

export const Camera = { view, assertSequential };
