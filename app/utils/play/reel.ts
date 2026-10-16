import type { SceneMode, Seekable } from "#shared/types/seekable";
import type { EasingParam, Timeline, Timer } from "animejs";
import type { Ref, ShallowRef } from "vue";

import { MOTION_EASE, prefersReducedMotion } from "@cela/design/utils/motion";
import { animate, createTimeline, createTimer } from "animejs";
import { onBeforeUnmount, onMounted, reactive, ref, shallowReactive, toRaw, watch } from "vue";

export type Driver = "demo" | "visitor";

export type Beat<S> = {
  at: number;
  apply: (state: S, step: number) => void;
  every?: number;
  steps?: number;
};

export type Channel = {
  name: string;
  at: number;
  from: number;
  to: number;
  duration: number;
  ease?: EasingParam;
};

export type Reel<S> = {
  duration: number;
  loop: { from: number; to: number };
  still: number;
  initial: () => S;
  beats: Beat<S>[];
  channels: Channel[];
};

export type Visitor<S> = {
  adopt: (state: S) => void;
  stop: () => void;
};

export type ReelOptions<S> = {
  reel: Reel<S>;
  mode: SceneMode;
  root: Readonly<ShallowRef<HTMLElement | null>>; // external contract: useTemplateRef
  visible: Readonly<Ref<boolean>>;
  visitor: (state: S) => Visitor<S>;
};

export type ReelHandle<S> = {
  view: { current: S };
  driver: Ref<Driver>;
  reduced: Ref<boolean>;
  seekable: Seekable & { ready: () => Promise<void> };
  takeOver: () => void;
  ensureVisitor: () => S;
  playDemo: () => void;
  tween: (name: string, value: number | [number, number], options?: { duration?: number; ease?: EasingParam }) => void;
};

export const HANDOVER_MS = 280;

const progressOf = <S>(beat: Beat<S>, ms: number): number => {
  if (!beat.every) return 0;
  const step = Math.floor((ms - beat.at) / beat.every) + 1;
  return Math.max(0, Math.min(beat.steps ?? Number.POSITIVE_INFINITY, step));
};

export const Reels = {
  replay<S>(reel: Reel<S>, ms: number): S {
    const state = reel.initial();
    for (const beat of reel.beats) {
      if (beat.at > ms) break;
      beat.apply(state, progressOf(beat, ms));
    }
    return state;
  },

  signature<S>(reel: Reel<S>, ms: number): string {
    let passed = 0;
    let steps = 0;
    for (const beat of reel.beats) {
      if (beat.at > ms) break;
      passed += 1;
      steps += progressOf(beat, ms);
    }
    return `${passed}:${steps}`;
  },

  // The end of whatever is moving at ms, so a takeover lands on a settled frame instead of a half tween.
  settleAt<S>(reel: Reel<S>, ms: number): number {
    let end = ms;
    for (const channel of reel.channels) {
      if (channel.at <= ms && ms < channel.at + channel.duration) end = Math.max(end, channel.at + channel.duration);
    }
    for (const beat of reel.beats) {
      if (beat.at > ms || !beat.every || !beat.steps) continue;
      const last = beat.at + beat.every * (beat.steps - 1);
      if (ms < last) end = Math.max(end, last);
    }
    return end;
  },

  rest(channels: Channel[]): Record<string, number> {
    const rest: Record<string, number> = {};
    for (const channel of [...channels].sort((a, b) => a.at - b.at)) {
      if (!(channel.name in rest)) rest[channel.name] = channel.from;
    }
    return rest;
  },
};

export const useReel = <S extends object>({ reel, mode, root, visible, visitor }: ReelOptions<S>): ReelHandle<S> => {
  const beats = [...reel.beats].sort((a, b) => a.at - b.at);
  const sorted: Reel<S> = { ...reel, beats };
  const view: { current: S } = shallowReactive({ current: Reels.replay(sorted, mode === "film" ? 0 : reel.loop.from) });
  const driver = ref<Driver>("demo");
  const reduced = ref(false);

  let timeline: Timeline | undefined;
  let signature = "";
  let pending: number | undefined;
  let handover: Timer | undefined;
  let rewinding = false;
  let live: Visitor<S> | undefined;

  const sync = (ms: number, force = false): void => {
    const next = Reels.signature(sorted, ms);
    if (!force && next === signature) return;
    signature = next;
    view.current = Reels.replay(sorted, ms);
  };

  const setRest = (el: HTMLElement): void => {
    for (const [name, value] of Object.entries(Reels.rest(sorted.channels))) el.style.setProperty(`--${name}`, String(value));
  };

  const build = (el: HTMLElement): Timeline => {
    timeline?.pause();
    setRest(el);
    const built = createTimeline({
      autoplay: false,
      onUpdate: (self) => {
        if (mode === "film" || driver.value !== "demo" || handover) return;
        if (self.currentTime >= reel.loop.to) rewind();
        else sync(self.currentTime);
      },
    });
    built.add({ duration: reel.duration }, 0);
    for (const channel of sorted.channels) {
      built.add(
        el,
        { [`--${channel.name}`]: [channel.from, channel.to], duration: channel.duration, ease: channel.ease ?? MOTION_EASE.out },
        channel.at,
      );
    }
    // A delayed tween stays unstyled until the playhead first crosses it, so sweep once.
    built.seek(reel.duration, true);
    built.seek(0, true);
    return built;
  };

  const seek = (ms: number): void => {
    const at = Math.max(0, Math.min(reel.duration, ms));
    if (!timeline) {
      pending = at;
      return;
    }
    timeline.seek(at, true);
    sync(at, true);
  };

  const canPlay = (): boolean => mode === "live" && !reduced.value && driver.value === "demo" && visible.value && !rewinding;

  const resume = (): void => {
    if (!timeline) return;
    if (canPlay()) timeline.play();
    else timeline.pause();
  };

  const rewind = (): void => {
    const el = root.value;
    if (!timeline || !el) return;
    timeline.pause();
    rewinding = true;
    animate(el, { "--loop": [1, 0], duration: 180, ease: MOTION_EASE.out, composition: "none" }).then(() => {
      seek(reel.loop.from);
      animate(el, { "--loop": [0, 1], duration: 300, ease: MOTION_EASE.out, composition: "none" });
      rewinding = false;
      resume();
    });
  };

  const adopt = (ms: number): S => {
    handover = undefined;
    const snapshot = reactive(structuredClone(toRaw(Reels.replay(sorted, ms)))) as S;
    view.current = snapshot;
    live = visitor(snapshot);
    live.adopt(snapshot);
    return snapshot;
  };

  const takeOver = (): void => {
    if (mode === "film" || driver.value === "visitor") return;
    driver.value = "visitor";
    if (!timeline) return;
    timeline.pause();
    const from = reduced.value ? reel.still : timeline.currentTime;
    const to = reduced.value ? from : Reels.settleAt(sorted, from);
    if (to <= from) {
      adopt(from);
      return;
    }
    const playhead = timeline;
    handover = createTimer({
      duration: Math.min(HANDOVER_MS, to - from),
      onUpdate: (self) => {
        const at = from + (to - from) * self.progress;
        playhead.seek(at, true);
        sync(at);
      },
      onComplete: () => {
        playhead.seek(to, true);
        adopt(to);
      },
    });
  };

  // An action that lands mid-handover settles it at once, so it always acts on the visitor's own copy.
  const ensureVisitor = (): S => {
    if (driver.value === "demo") takeOver();
    if (handover) {
      handover.pause();
      const to = Reels.settleAt(sorted, timeline?.currentTime ?? reel.still);
      timeline?.seek(to, true);
      return adopt(to);
    }
    return view.current;
  };

  const playDemo = (): void => {
    if (mode === "film") return;
    handover?.pause();
    handover = undefined;
    live?.stop();
    live = undefined;
    driver.value = "demo";
    const el = root.value;
    if (!el) return;
    timeline = build(el);
    el.style.setProperty("--loop", "1");
    seek(reduced.value ? reel.still : reel.loop.from);
    resume();
  };

  const tween: ReelHandle<S>["tween"] = (name, value, { duration = 300, ease = MOTION_EASE.out } = {}) => {
    const el = root.value;
    if (!el) return;
    if (reduced.value) {
      el.style.setProperty(`--${name}`, String(Array.isArray(value) ? value[1] : value));
      return;
    }
    animate(el, { [`--${name}`]: value, duration, ease, composition: "none" });
  };

  onMounted(() => {
    const el = root.value;
    if (!el) return;
    reduced.value = mode === "live" && prefersReducedMotion();
    timeline = build(el);
    el.style.setProperty("--loop", "1");
    if (mode === "film") seek(pending ?? 0);
    else seek(reduced.value ? reel.still : reel.loop.from);
    pending = undefined;
    resume();
  });

  watch(visible, resume);

  onBeforeUnmount(() => {
    handover?.pause();
    live?.stop();
    timeline?.pause();
    timeline = undefined;
  });

  return {
    view,
    driver,
    reduced,
    seekable: {
      duration: reel.duration,
      seek,
      ready: () => document.fonts.ready.then(() => undefined),
    },
    takeOver,
    ensureVisitor,
    playDemo,
    tween,
  };
};
