import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

type Frame = (now: number) => void;

const TICK = 1000 / 60;
const env = {
  frames: new Map<number, Frame>(),
  id: 0,
  now: 0,
  listeners: new Map<string, Set<() => void>>(),
  dataset: {} as Record<string, string>,
  scoped: false,
  disposers: [] as (() => void)[],
};

Object.assign(globalThis, {
  requestAnimationFrame: (callback: Frame): number => {
    env.frames.set(++env.id, callback);
    return env.id;
  },
  cancelAnimationFrame: (id: number): void => void env.frames.delete(id),
  addEventListener: (type: string, listener: () => void): void => {
    env.listeners.set(type, (env.listeners.get(type) ?? new Set()).add(listener));
  },
  removeEventListener: (type: string, listener: () => void): void => void env.listeners.get(type)?.delete(listener),
  document: { documentElement: { dataset: env.dataset } },
  getCurrentScope: (): object | undefined => (env.scoped ? {} : undefined),
  onScopeDispose: (dispose: () => void): void => void env.disposers.push(dispose),
});

const { useScrub } = await import("./scrub.ts");

const tick = (ms = TICK): void => {
  const queued = [...env.frames.values()];
  env.frames.clear();
  env.now += ms;
  for (const frame of queued) frame(env.now);
};

const emit = (type: string): void => env.listeners.get(type)?.forEach((listener) => listener());

const settle = (limit = 200): number => {
  let frames = 0;
  while (env.frames.size && frames < limit) {
    tick();
    frames++;
  }
  return frames;
};

const scrub = (start: number) => {
  const raw = { value: start };
  const seen: number[] = [];
  const handle = useScrub({ goal: () => raw.value, update: (progress) => seen.push(progress) });
  return { raw, seen, handle, shown: (): number => seen.at(-1) ?? Number.NaN };
};

const close = (actual: number, expected: number, within = 1e-9): void =>
  assert.ok(Math.abs(actual - expected) < within, `${actual} is not within ${within} of ${expected}`);

describe("useScrub", () => {
  beforeEach(() => {
    env.frames.clear();
    env.listeners.clear();
    env.disposers.length = 0;
    env.scoped = false;
    env.now = 1000;
    env.dataset.motion = "on";
  });

  it("seeds from the goal at once and asks for no frame at rest", () => {
    const { seen } = scrub(0.4);
    assert.deepEqual(seen, [0.4]);
    assert.equal(env.frames.size, 0);
  });

  it("writes nothing for a wake that leaves the value where it was", () => {
    const { seen } = scrub(0);
    emit("scroll");
    emit("resize");
    tick();
    assert.deepEqual(seen, [0]);
    assert.equal(env.frames.size, 0);
  });

  it("moves 13 percent of the gap on the first frame after a raw change", () => {
    const { raw, shown } = scrub(0.4);
    raw.value = 0.9;
    emit("scroll");
    tick();
    close(shown(), 0.9 - 0.5 * Math.exp(-TICK / 120));
  });

  it("wakes on resize as well as scroll", () => {
    const { raw, shown } = scrub(0);
    raw.value = 1;
    emit("resize");
    assert.equal(env.frames.size, 1);
    settle();
    assert.equal(shown(), 1);
  });

  it("lands exactly on the goal and stops asking for frames", () => {
    const { raw, seen, shown } = scrub(0);
    raw.value = 1;
    emit("scroll");
    const frames = settle();
    assert.equal(shown(), 1);
    assert.equal(env.frames.size, 0);
    assert.ok(frames <= Math.ceil((120 * Math.log(1 / 0.001)) / TICK) + 1, `took ${frames} frames`);
    assert.ok(seen.every((value, i) => i === 0 || value >= seen[i - 1]!), "went backwards");
  });

  it("lands exactly on 0 on the way back, so a stop near either end still arrives", () => {
    const { raw, shown } = scrub(1);
    raw.value = 0;
    emit("scroll");
    settle();
    assert.equal(shown(), 0);
    assert.equal(env.frames.size, 0);
  });

  it("lands in the frame after a long one instead of parking short", () => {
    const { raw, shown } = scrub(0);
    raw.value = 0.5;
    emit("scroll");
    tick();
    tick(1000);
    assert.equal(shown(), 0.5);
    assert.equal(env.frames.size, 0);
  });

  it("asks for one frame however many raw changes arrive before it", () => {
    const { raw } = scrub(0);
    raw.value = 1;
    emit("scroll");
    emit("scroll");
    emit("resize");
    assert.equal(env.frames.size, 1);
  });

  it("chases a goal that moves while it converges", () => {
    const { raw, seen, shown } = scrub(0);
    raw.value = 1;
    emit("scroll");
    for (let i = 0; i < 5; i++) tick();
    const turned = seen.length;
    raw.value = 0.2;
    settle();
    assert.equal(shown(), 0.2);
    assert.ok(seen.slice(turned).every((value, i, after) => i === 0 || value <= after[i - 1]!), "overshot on the way back");
  });

  it("restarts from one 60 fps tick after resting, not the time since its last run", () => {
    const { raw, shown } = scrub(0);
    raw.value = 0.5;
    emit("scroll");
    settle();
    env.now += 5000;
    raw.value = 1;
    emit("scroll");
    tick();
    close(shown(), 1 - 0.5 * Math.exp(-TICK / 120));
  });

  it("passes raw progress through in one frame under reduced motion", () => {
    env.dataset.motion = "off";
    const { raw, seen } = scrub(0);
    raw.value = 0.7;
    emit("scroll");
    tick();
    assert.deepEqual(seen, [0, 0.7]);
    assert.equal(env.frames.size, 0);
  });

  it("stops for good: no frame, no listener, no update, and a second stop is harmless", () => {
    const { raw, seen, handle } = scrub(0);
    raw.value = 1;
    emit("scroll");
    handle.stop();
    assert.equal(env.frames.size, 0);
    emit("scroll");
    handle.wake();
    assert.equal(env.frames.size, 0);
    assert.equal(env.listeners.get("scroll")?.size ?? 0, 0);
    assert.equal(env.listeners.get("resize")?.size ?? 0, 0);
    handle.stop();
    assert.deepEqual(seen, [0]);
  });

  it("stays stopped when stopped at rest and woken by hand", () => {
    const { raw, seen, handle } = scrub(0);
    handle.stop();
    raw.value = 1;
    handle.wake();
    tick();
    assert.equal(env.frames.size, 0);
    assert.deepEqual(seen, [0]);
  });

  it("stops itself when its effect scope is disposed", () => {
    env.scoped = true;
    const { raw } = scrub(0);
    assert.equal(env.disposers.length, 1);
    env.disposers[0]!();
    raw.value = 1;
    emit("scroll");
    assert.equal(env.frames.size, 0);
  });

  it("registers no disposer outside an effect scope", () => {
    scrub(0);
    assert.equal(env.disposers.length, 0);
  });
});
