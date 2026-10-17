import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

export const FENCE = {
  gates: 8,
  spacing: 1,
  start: -5.4,
  end: 7.4,
  speed: 1.875,
  every: 3200,
  approach: 0.5,
  hold: 600,
  held: 1200,
  turn: MOTION_DURATION.slow,
  back: 1600,
  retreat: 2.4,
} as const;

export type Spec = { path: string; gate?: number };

// Real paths in this repo; gate is the rule number that sends the change back.
export const CHANGES: Spec[] = [
  { path: "app/pages/index.vue" },
  { path: "app/utils/stage/island.ts", gate: 3 },
  { path: "app/components/stage/hero.vue" },
  { path: "nuxt.config.ts" },
  { path: "app/components/site/nav.vue", gate: 7 },
  { path: "app/utils/stage/line.ts" },
  { path: "app/pages/how.vue", gate: 4 },
  { path: "app/components/stage/fence.vue" },
  { path: "app/assets/css/main.css", gate: 2 },
  { path: "shared/types/seekable.ts" },
];

export const CYCLE = CHANGES.length * FENCE.every;

export type Status = "flow" | "stopped" | "back" | "gone";
export type Pose = { status: Status; front: number; opacity: number; turn: number; outline: number; lit: number; gate: number };

export const gateX = (n: number): number => (n - (FENCE.gates + 1) / 2) * FENCE.spacing;

export const spec = (k: number): Spec => CHANGES[((k % CHANGES.length) + CHANGES.length) % CHANGES.length] ?? { path: "" };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const SLOPE = MOTION_EASE.out(0.0001) / 0.0001;
const APPROACH = (SLOPE * FENCE.approach * 1000) / FENCE.speed;

const flowing = (t: number): number => FENCE.start + (FENCE.speed * t) / 1000;

const approaching = (t: number, stop: number): { front: number; arrived: number } => {
  const cruise = ((stop - FENCE.approach - FENCE.start) / FENCE.speed) * 1000;
  const arrived = cruise + APPROACH;
  if (t <= cruise) return { front: flowing(t), arrived };
  return { front: stop - FENCE.approach + FENCE.approach * MOTION_EASE.out(clamp01((t - cruise) / APPROACH)), arrived };
};

export const pose = (k: number, ms: number, clickedAt = Infinity): Pose => {
  const t = ms - k * FENCE.every;
  const { gate } = spec(k);
  const gone: Pose = { status: "gone", front: FENCE.end, opacity: 0, turn: 0, outline: 0, lit: 0, gate: 0 };
  if (t < 0) return gone;

  const gateStop = gate ? gateX(gate) - 0.06 : Infinity;
  const at = (time: number): number => (gate ? approaching(time, gateStop).front : flowing(time));
  const arrived = gate ? approaching(t, gateStop).arrived : Infinity;
  const clickT = clickedAt - k * FENCE.every;
  const clicked = clickedAt <= ms && clickT >= 0 && clickT < arrived && at(clickT) < FENCE.end;

  if (!clicked && !gate) {
    const front = flowing(t);
    return front >= FENCE.end ? gone : { ...gone, status: "flow", front, opacity: 1 };
  }

  const stoppedAt = clicked ? clickT : arrived;
  const front = clicked ? at(clickT) : gateStop;
  if (t < stoppedAt) return { ...gone, status: "flow", front: at(t), opacity: 1 };

  const hold = clicked ? FENCE.held : FENCE.hold;
  const since = t - stoppedAt;
  const turn = MOTION_EASE.inOut(clamp01((since - hold) / FENCE.turn));
  const leaving = clamp01((since - hold - FENCE.turn) / FENCE.back);
  if (leaving >= 1) return gone;
  const fade = 1 - MOTION_EASE.out(leaving);
  const marked = since < hold + FENCE.turn ? 1 : fade;
  return {
    status: leaving > 0 ? "back" : "stopped",
    front: front - FENCE.retreat * MOTION_EASE.out(leaving),
    opacity: fade,
    turn,
    outline: clicked ? marked : 0,
    lit: clicked ? 0 : marked,
    gate: clicked ? 0 : (gate ?? 0),
  };
};

export const REST_MS = FENCE.every + approaching(0, gateX(spec(1).gate ?? 1) - 0.06).arrived + FENCE.hold / 2;

export const inFlight = (ms: number): number[] => {
  const life = Math.ceil(((FENCE.end - FENCE.start) / FENCE.speed) * 1000 + FENCE.held + FENCE.turn + FENCE.back);
  const first = Math.max(0, Math.floor((ms - life) / FENCE.every));
  const last = Math.floor(ms / FENCE.every);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
};
