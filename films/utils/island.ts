import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { HALO_HEIGHT, ISLAND, STAGE_CAMERA, type CameraPreset } from "../../app/utils/stage/camera.ts";
import { FRAME, GRID, WINDOW, type Cut, type FilmScript } from "../scripts/script.ts";
import { SKY } from "./sky.ts";

export const MOTION = {
  crossfade: MOTION_DURATION.base,
  carry: MOTION_DURATION.slow,
  open: GRID.beatMs,
  depth: { rest: ISLAND.depth, open: 0.08 },
  radius: 24,
  carried: { width: 2.9 / ISLAND.width, height: 1.04 / ISLAND.height },
  rest: { wide: 576, tall: 432 },
} as const;

export type Box = { x: number; y: number; width: number; height: number; radius: number };

export type IslandState = { box: Box; depth: number; core: number; opacity: number; line: number; breathe: number };

export type IslandTimes = { carry?: number; open: number; fold: number; close: number };

const rest = (cut: Cut): Box => {
  const width = MOTION.rest[cut];
  const height = (width * ISLAND.height) / ISLAND.width;
  return { x: FRAME[cut].width / 2, y: FRAME[cut].height / 2, width, height, radius: height / 2 };
};

const carried = (cut: Cut): Box => {
  const box = rest(cut);
  return { ...box, width: box.width * MOTION.carried.width, height: box.height * MOTION.carried.height };
};

const glass = (cut: Cut): Box => {
  const { x, y, width, height } = WINDOW[cut];
  return { x: x + width / 2, y: y + height / 2, width, height, radius: MOTION.radius };
};

const bevel = (depth: number): number => Math.min(0.06, depth / 3);

// The camera stands back far enough that the rest pill is the stage's own 2.4-wide island, so its line and halo keep their proportions in both cuts.
const camera = (cut: Cut): CameraPreset => {
  const edge = MOTION.depth.rest / 2 - bevel(MOTION.depth.rest);
  const distance = edge + ((ISLAND.width / MOTION.rest[cut]) * FRAME[cut].height) / (2 * Math.tan((STAGE_CAMERA.hero.fov * Math.PI) / 360));
  return { fov: STAGE_CAMERA.hero.fov, position: [0, 0, distance], target: [0, 0, 0] };
};

// World units per px on the plane of the slab's widest outline, where its silhouette is drawn.
const scale = ({ cut, depth }: { cut: Cut; depth: number }): number => {
  const preset = camera(cut);
  const edge = depth / 2 - bevel(depth);
  return (2 * (preset.position[2] - edge) * Math.tan((preset.fov * Math.PI) / 360)) / FRAME[cut].height;
};

const progress = ({ ms, from, length }: { ms: number; from: number; length: number }): number => Math.min(1, Math.max(0, (ms - from) / length));

// The ends are exact, so the end card's pill is bit for bit the title's and the slab is not rebuilt for a rounding difference.
const mix = (from: number, to: number, t: number): number => (t <= 0 ? from : t >= 1 ? to : from + (to - from) * t);

const lerp = (from: Box, to: Box, t: number): Box => ({
  x: mix(from.x, to.x, t),
  y: mix(from.y, to.y, t),
  width: mix(from.width, to.width, t),
  height: mix(from.height, to.height, t),
  radius: mix(from.radius, to.radius, t),
});

const pose = ({ ms, cut, times }: { ms: number; cut: Cut; times: IslandTimes }): IslandState => {
  const { inOut, out } = MOTION_EASE;
  const carry = times.carry ? inOut(progress({ ms, from: times.carry, length: MOTION.carry })) : 0;
  const open = inOut(progress({ ms, from: times.open - MOTION.open, length: MOTION.open }));
  const fold = inOut(progress({ ms, from: times.fold + MOTION.crossfade, length: times.close - times.fold - MOTION.crossfade }));
  const folding = ms >= times.fold;
  const title = lerp(rest(cut), carried(cut), carry);
  const exit = progress({ ms, from: times.open - SKY.exit, length: SKY.exit });
  const fadeOut = inOut(progress({ ms, from: times.open, length: MOTION.crossfade }));
  const fadeIn = inOut(progress({ ms, from: times.fold, length: MOTION.crossfade }));
  const landed = progress({ ms, from: times.close, length: GRID.beatMs });
  return {
    box: folding ? lerp(glass(cut), rest(cut), fold) : lerp(title, glass(cut), open),
    depth: folding ? mix(MOTION.depth.open, MOTION.depth.rest, fold) : mix(MOTION.depth.rest, MOTION.depth.open, open),
    core: folding ? fold : carry * (1 - exit),
    opacity: folding ? fadeIn : 1 - fadeOut,
    line: out(landed),
    breathe: landed,
  };
};

const problems = (times: IslandTimes): string[] => [
  ...(times.carry && times.carry + MOTION.carry > times.open - MOTION.open ? [`the title carry at ${times.carry} ms runs into the open at ${times.open - MOTION.open}`] : []),
  ...(times.open + MOTION.crossfade > times.fold ? [`the fold at ${times.fold} ms starts before the open's crossfade ends at ${times.open + MOTION.crossfade}`] : []),
  ...(times.fold + MOTION.crossfade >= times.close ? [`the close at ${times.close} ms leaves no glide after the fold's crossfade ends at ${times.fold + MOTION.crossfade}`] : []),
];

const times = (script: FilmScript): IslandTimes => ({ ...script.island, open: script.rig.at ?? GRID.barMs, fold: script.rig.until, close: script.close });

const endTop = (cut: Cut): number => {
  const box = rest(cut);
  return box.y + box.height / 2 + ((ISLAND.lineGap + HALO_HEIGHT / 2) * MOTION.rest[cut]) / ISLAND.width;
};

export const IslandMotion = { pose, rest, glass, camera, scale, problems, times, endTop };
