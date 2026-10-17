import { MOTION_EASE } from "@cela/design/utils/motion";
import type { Shot } from "../scripts/script.ts";

export type View = { x: number; y: number; scale: number };

const IDENTITY: View = { x: 0, y: 0, scale: 1 };

const LIMIT = { scale: 1.6, margin: 48, push: { min: 1800, max: 2400 }, hold: 1500 } as const;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const axis = ({ center, scale, size }: { center: number; scale: number; size: number }): number =>
  scale * size >= size ? clamp(size / 2 - scale * center, size - scale * size, 0) : (size - scale * size) / 2;

export type Box = { x: number; y: number; width: number; height: number };

// Rig coordinates undo whatever transform the rig carries right now, so a box reads the same at any camera position.
const local = ({ rig, element }: { rig: HTMLElement; element: Element }): Box => {
  const box = rig.getBoundingClientRect();
  const target = element.getBoundingClientRect();
  const current = box.width / rig.offsetWidth;
  return { x: (target.left - box.left) / current, y: (target.top - box.top) / current, width: target.width / current, height: target.height / current };
};

const frame = ({ shot, rig }: { shot: Shot; rig: HTMLElement }): View => {
  const width = rig.offsetWidth;
  const height = rig.offsetHeight;
  const anchor = shot.anchor ? rig.querySelector(`[data-film-anchor="${shot.anchor}"]`) : undefined;
  let center = { x: width / 2, y: height / 2 };
  let scale = Math.min(shot.scale, LIMIT.scale);
  if (anchor) {
    const target = local({ rig, element: anchor });
    center = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
    scale = Math.min(scale, (width - 2 * LIMIT.margin) / target.width, (height - 2 * LIMIT.margin) / target.height);
  }
  return { x: axis({ center: center.x, scale, size: width }), y: axis({ center: center.y, scale, size: height }), scale };
};

// Each shot is framed where its move lands, so the view is fixed per shot and no render order can change it.
const measure = ({ shots, rig, at }: { shots: Shot[]; rig: HTMLElement; at: <T>(points: number[], read: (index: number) => T) => Promise<T[]> }): Promise<View[]> =>
  at(
    shots.map((shot) => shot.at + shot.duration),
    (index) => {
      const shot = shots[index];
      return shot ? frame({ shot, rig }) : IDENTITY;
    },
  );

const view = ({ shots, views, ms }: { shots: Shot[]; views: View[]; ms: number }): View => {
  const index = shots.findLastIndex((shot) => shot.at <= ms);
  const shot = shots[index];
  const end = views[index];
  if (!shot || !end) return IDENTITY;
  const start = views[index - 1] ?? IDENTITY;
  const progress = shot.duration ? MOTION_EASE.inOut(clamp((ms - shot.at) / shot.duration, 0, 1)) : 1;
  return { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress, scale: start.scale + (end.scale - start.scale) * progress };
};

const validate = (shots: Shot[]): void => {
  shots.forEach((shot, index) => {
    const previous = shots[index - 1];
    const next = shots[index + 1];
    if (previous && shot.at < previous.at + previous.duration) throw new Error(`shot at ${shot.at} ms starts before the one at ${previous.at} ms ends`);
    if (shot.scale > LIMIT.scale) throw new Error(`shot at ${shot.at} ms pushes to ${shot.scale}, past ${LIMIT.scale}`);
    const push = shot.scale > 1.05 && shot.scale > (previous?.scale ?? 1);
    if (!push) return;
    if (shot.duration < LIMIT.push.min || shot.duration > LIMIT.push.max) throw new Error(`push at ${shot.at} ms takes ${shot.duration} ms, outside ${LIMIT.push.min} to ${LIMIT.push.max}`);
    if (next && next.at < shot.at + shot.duration + LIMIT.hold) throw new Error(`push at ${shot.at} ms holds under ${LIMIT.hold} ms before the next move`);
  });
};

export const Camera = { measure, view, validate, local };
