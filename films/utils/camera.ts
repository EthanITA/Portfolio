import { MOTION_EASE } from "@cela/design/utils/motion";
import { GRID, onBeat, SAFE_MARGIN, type Shot } from "../scripts/script.ts";

export type View = { x: number; y: number; scale: number };

export type Size = { width: number; height: number };

const IDENTITY: View = { x: 0, y: 0, scale: 1 };

const LIMIT = { scale: 1.6, margin: SAFE_MARGIN, push: { over: 1.05, beats: [2] }, move: { beats: [2, 4] }, hold: 2 * GRID.beatMs, drift: 0.02 } as const;

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
  let center = { x: width / 2, y: height / 2 };
  let scale = Math.min(shot.scale, LIMIT.scale);
  if (shot.anchor) {
    const anchor = rig.querySelector(`[data-film-anchor="${shot.anchor}"]`);
    const target = anchor ? local({ rig, element: anchor }) : undefined;
    if (!target?.width || !target.height) throw new Error(`shot at ${shot.at} ms frames "${shot.anchor}", which has no box where the move lands`);
    center = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
    scale = Math.min(scale, (width - 2 * LIMIT.margin) / target.width, (height - 2 * LIMIT.margin) / target.height);
    if (shot.scale > LIMIT.push.over && scale <= LIMIT.push.over)
      throw new Error(`push at ${shot.at} ms on "${shot.anchor}" can't zoom, its ${Math.round(target.width)}x${Math.round(target.height)} box caps the scale at ${scale.toFixed(2)}`);
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

// A held view keeps creeping in around what it shows, so no two frames of a hold are the same picture.
const drift = ({ view, amount, size }: { view: View; amount: number; size: Size }): View => {
  const scale = view.scale * (1 + amount);
  const center = { x: (size.width / 2 - view.x) / view.scale, y: (size.height / 2 - view.y) / view.scale };
  return { x: axis({ center: center.x, scale, size: size.width }), y: axis({ center: center.y, scale, size: size.height }), scale };
};

const held = ({ view, from, to, ms, size }: { view: View; from: number; to: number; ms: number; size: Size }): View =>
  drift({ view, amount: to > from ? LIMIT.drift * clamp((ms - from) / (to - from), 0, 1) : 0, size });

const view = ({ shots, views, ms, size, from = 0, until }: { shots: Shot[]; views: View[]; ms: number; size: Size; from?: number; until: number }): View => {
  const index = shots.findLastIndex((shot) => shot.at <= ms);
  const rest = (position: number): View => {
    const shot = shots[position];
    const next = shots[position + 1]?.at ?? until;
    if (!shot) return held({ view: IDENTITY, from, to: shots[0]?.at ?? until, ms, size });
    return held({ view: views[position] ?? IDENTITY, from: shot.at + shot.duration, to: next, ms, size });
  };
  const shot = shots[index];
  const end = views[index];
  if (!shot || !end || ms >= shot.at + shot.duration) return rest(index);
  const start = rest(index - 1);
  const progress = MOTION_EASE.inOut(clamp((ms - shot.at) / shot.duration, 0, 1));
  return { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress, scale: start.scale + (end.scale - start.scale) * progress };
};

const validate = (shots: Shot[]): void => {
  shots.forEach((shot, index) => {
    const previous = shots[index - 1];
    const next = shots[index + 1];
    const push = shot.scale > LIMIT.push.over && shot.scale > (previous?.scale ?? 1);
    const beats = shot.duration / GRID.beatMs;
    const allowed: readonly number[] = push ? LIMIT.push.beats : LIMIT.move.beats;
    if (previous && shot.at < previous.at + previous.duration) throw new Error(`shot at ${shot.at} ms starts before the one at ${previous.at} ms ends`);
    if (shot.scale > LIMIT.scale) throw new Error(`shot at ${shot.at} ms pushes to ${shot.scale}, past ${LIMIT.scale}`);
    if (!onBeat(shot.at)) throw new Error(`shot at ${shot.at} ms starts off the ${GRID.beatMs} ms beat`);
    if (!allowed.includes(beats)) throw new Error(`${push ? "push" : "move"} at ${shot.at} ms takes ${shot.duration} ms, not ${allowed.join(" or ")} beats`);
    if (push && next && next.at < shot.at + shot.duration + LIMIT.hold) throw new Error(`push at ${shot.at} ms holds under ${LIMIT.hold} ms before the next move`);
  });
};

export const Camera = { measure, view, validate, local };
