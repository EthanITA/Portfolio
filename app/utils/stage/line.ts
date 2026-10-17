import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

export const TIERS = ["runs", "waits", "stops"] as const;
export type Tier = (typeof TIERS)[number];

const WORDS: [Tier, RegExp][] = [
  ["stops", /\b(pay|send|buy|order|sign|share|push|publish|deploy|transfer|wire)\b/],
  ["waits", /\b(delete|remove|rm|overwrite|move|rename|install|join|change|write|edit|update|book)\b/],
  ["runs", /\b(find|list|show|search|read|count|check|look|open|grep|see|get)\b/],
];

// An ask the toy can't place waits for a person rather than running.
export const tierOf = (text: string): Tier => {
  const ask = text.toLowerCase();
  return WORDS.find(([, words]) => words.test(ask))?.[0] ?? "waits";
};

export type Action = { id: number; text: string; tier: Tier; slot: number; at: number; releasedAt: number; retiredAt: number };
export type Status = "travel" | "waiting" | "stopped" | "through" | "gone";
export type Pose = { status: Status; z: number; opacity: number; tint: number; check: boolean; outline: number; glow: number };

export const LINE = {
  spawnZ: 3.2,
  waitZ: 0.3,
  beyondZ: -1.4,
  goneZ: -9,
  travel: 1400,
  through: 3600,
  linger: 2400,
  every: 2800,
} as const;

const RUN = ((LINE.spawnZ - LINE.goneZ) / LINE.spawnZ) * LINE.travel;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const out = (t: number): number => MOTION_EASE.out(clamp01(t));

const inverseOut = (target: number): number => {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (MOTION_EASE.out(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
};

const WAIT_CROSSES = LINE.through * inverseOut(LINE.waitZ / (LINE.waitZ - LINE.goneZ));

const crossing = (since: number): Pick<Pose, "tint" | "check"> => ({ tint: clamp01(since / MOTION_DURATION.base), check: since >= 0 });

export const pose = (action: Action, now: number, reduced?: boolean): Pose => {
  const t = now - action.at;
  const released = action.releasedAt <= now;
  const settled = now - action.releasedAt;
  const fading = action.retiredAt <= now ? clamp01((now - action.retiredAt) / MOTION_DURATION.fast) : 0;
  const base: Pose = { status: "travel", z: LINE.spawnZ, opacity: 1 - fading, tint: 0, check: false, outline: 0, glow: 0 };
  const gone: Pose = { ...base, status: "gone", opacity: 0 };
  if (t < 0 || fading >= 1) return gone;

  if (reduced) {
    const since = released ? settled : t;
    const appear = clamp01(since / MOTION_DURATION.base);
    if (released || action.tier === "runs") {
      const leave = clamp01((since - LINE.linger) / MOTION_DURATION.base);
      if (leave >= 1) return gone;
      return { ...base, status: "through", z: LINE.beyondZ, opacity: base.opacity * appear * (1 - leave), tint: 1, check: true };
    }
    const resting = action.tier === "waits" ? { status: "waiting" as const, z: LINE.waitZ } : { status: "stopped" as const, z: 0, outline: 1, glow: 1 };
    return { ...base, ...resting, opacity: base.opacity * appear };
  }

  if (action.tier === "runs") {
    if (t >= RUN) return gone;
    const z = LINE.spawnZ - (LINE.spawnZ / LINE.travel) * t;
    return { ...base, status: t < LINE.travel ? "travel" : "through", z, ...crossing(t - LINE.travel) };
  }

  const rest = action.tier === "waits" ? LINE.waitZ : 0;
  if (!released) {
    const arrived = t >= LINE.travel;
    const z = LINE.spawnZ + (rest - LINE.spawnZ) * out(t / LINE.travel);
    if (action.tier === "waits") return { ...base, status: arrived ? "waiting" : "travel", z };
    const lit = arrived ? out((t - LINE.travel) / MOTION_DURATION.base) : 0;
    return { ...base, status: arrived ? "stopped" : "travel", z, outline: lit, glow: lit };
  }

  if (settled >= LINE.through) return gone;
  const z = rest + (LINE.goneZ - rest) * out(settled / LINE.through);
  const dim = action.tier === "stops" ? 1 - out(settled / MOTION_DURATION.base) : 0;
  return { ...base, status: "through", z, ...crossing(settled - (action.tier === "waits" ? WAIT_CROSSES : 0)), outline: dim, glow: dim };
};

export const releasable = (action: Action, now: number, reduced?: boolean): boolean =>
  action.releasedAt > now && action.retiredAt > now && pose(action, now, reduced).status === "waiting";

export const pressable = (action: Action, now: number, reduced?: boolean): boolean =>
  action.releasedAt > now && action.retiredAt > now && pose(action, now, reduced).status === "stopped";

export const active = (action: Action, now: number, reduced?: boolean): boolean => action.retiredAt > now && pose(action, now, reduced).status !== "gone";

export const settling = (action: Action, now: number): boolean => {
  const { status } = pose(action, now, true);
  if (status === "gone") return false;
  return now - action.at < MOTION_DURATION.base || action.retiredAt <= now || status === "through";
};

export type Ledger = {
  actions: Action[];
  send: (text: string, at: number, slots: number) => Action | undefined;
  release: (at: number, id?: number) => Action | undefined;
  press: (at: number, id: number) => Action | undefined;
  prune: (now: number) => void;
};

const ORDER: Record<number, number[]> = { 2: [0, 1], 4: [1, 2, 0, 3] };

export const createLedger = (reduced: () => boolean): Ledger => {
  const actions: Action[] = [];
  let id = 0;

  const send = (text: string, at: number, slots: number): Action | undefined => {
    const ask = text.trim();
    if (!ask) return undefined;
    const live = actions.filter((action) => active(action, at, reduced()));
    const oldest = live.length >= slots ? live[0] : undefined;
    if (oldest) oldest.retiredAt = at;
    const taken = new Set(live.filter((action) => action !== oldest).map((action) => action.slot));
    const slot = (ORDER[slots] ?? [...Array(slots).keys()]).find((s) => !taken.has(s)) ?? oldest?.slot ?? 0;
    const action: Action = { id: ++id, text: ask, tier: tierOf(ask), slot, at, releasedAt: Infinity, retiredAt: Infinity };
    actions.push(action);
    return action;
  };

  const release = (at: number, target?: number): Action | undefined => {
    const action = actions.find((a) => (target ? a.id === target : true) && releasable(a, at, reduced()));
    if (action) action.releasedAt = at;
    return action;
  };

  const press = (at: number, target: number): Action | undefined => {
    const action = actions.find((a) => a.id === target && pressable(a, at, reduced()));
    if (action) action.releasedAt = at;
    return action;
  };

  const prune = (now: number): void => {
    for (let i = actions.length - 1; i >= 0; i--) {
      const action = actions[i];
      if (action && pose(action, now, reduced()).status === "gone" && action.at <= now) actions.splice(i, 1);
    }
  };

  return { actions, send, release, press, prune };
};
