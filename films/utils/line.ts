import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { GRID, type Stop } from "../scripts/script.ts";

export const VIOLET = {
  draw: GRID.beatMs,
  pulse: { low: 0.6, over: 400 },
  flare: { height: 1.8, over: 500 },
  stop: { weight: 2, ease: MOTION_DURATION.fast },
} as const;

export type LinePose = { draw: number; glow: number; height: number; weight: number; opacity: number };

export type LineOptions = { ms: number; anchors: number[]; stops: Stop[]; fold: number; close: number };

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const ramp = ({ ms, from, length }: { ms: number; from: number; length: number }): number => clamp((ms - from) / length);

const held = ({ ms, stops }: { ms: number; stops: Stop[] }): number =>
  Math.max(0, ...stops.map(({ at, until }) => MOTION_EASE.out(ramp({ ms, from: at, length: VIOLET.stop.ease })) * (1 - MOTION_EASE.out(ramp({ ms, from: until, length: VIOLET.stop.ease })))));

const pose = ({ ms, anchors, stops, fold, close }: LineOptions): LinePose => {
  const beat = GRID.originMs + Math.floor((ms - GRID.originMs) / GRID.beatMs) * GRID.beatMs;
  const pulse = ms < close ? 1 - (1 - VIOLET.pulse.low) * MOTION_EASE.out(ramp({ ms, from: beat, length: VIOLET.pulse.over })) : 1;
  const stop = held({ ms, stops });
  const anchor = anchors.findLast((at) => at <= ms && ms < at + VIOLET.flare.over);
  const flare = typeof anchor === "number" ? Math.sin((Math.PI * (ms - anchor)) / VIOLET.flare.over) : 0;
  return {
    draw: MOTION_EASE.out(ramp({ ms, from: 0, length: VIOLET.draw })),
    glow: pulse + (1 - pulse) * stop,
    height: 1 + (VIOLET.flare.height - 1) * flare,
    weight: 1 + (VIOLET.stop.weight - 1) * stop,
    opacity: 1 - MOTION_EASE.inOut(ramp({ ms, from: fold, length: close - fold })),
  };
};

export const VioletLine = { pose };
