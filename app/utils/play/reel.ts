import type { SceneMode, Seekable } from "#shared/types/seekable";
import type { EasingParam, JSAnimation, Timeline, Timer } from "animejs";
import type { Ref, ShallowRef } from "vue";
import type { FeatureBeat } from "./script/typed";

import { MOTION_EASE, prefersReducedMotion } from "@cela/design/utils/motion";
import { animate, createTimeline, createTimer, svg } from "animejs";
import { onBeforeUnmount, onMounted, reactive, readonly, ref, shallowReactive, toRaw, watch, watchEffect } from "vue";
import { useInvite } from "./invite";

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

export type Drawn = {
  selector: string;
  at: number;
  from: string;
  to: string;
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
  drawn?: Drawn[];
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
  beats?: FeatureBeat[];
};

export type PlayControl = {
  driver: Readonly<Ref<Driver>>;
  take: () => void;
  demo: () => void;
};

export type ReelHandle<S> = {
  view: { current: S };
  driver: Ref<Driver>;
  reduced: Ref<boolean>;
  seekable: Seekable & { ready: () => Promise<void> };
  control: PlayControl;
  show: (beat: string) => void;
  takeOver: () => void;
  ensureVisitor: () => S;
  playDemo: () => void;
  tween: (name: string, value: number | [number, number], options?: { duration?: number; ease?: EasingParam }) => void;
  draw: (selector: string, to: string, options?: { duration?: number; ease?: EasingParam }) => void;
};

export const HANDOVER_MS = 280;

export const CARET_MS = 530;

export const useCaret = ({ visible, reduced }: { visible: Readonly<Ref<boolean>>; reduced: Readonly<Ref<boolean>> }): Ref<number> => {
  const blink = ref(0);
  const timer = createTimer({ duration: CARET_MS, loop: true, autoplay: false, onLoop: () => (blink.value = blink.value ? 0 : 1) });
  watchEffect(() => {
    if (visible.value && !reduced.value) timer.play();
    else {
      timer.pause();
      blink.value = 0;
    }
  });
  onBeforeUnmount(() => timer.cancel());
  return blink;
};

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
    for (const channel of [...reel.channels, ...(reel.drawn ?? [])]) {
      if (channel.at <= ms && ms < channel.at + channel.duration) end = Math.max(end, channel.at + channel.duration);
    }
    for (const beat of reel.beats) {
      if (beat.at > ms || !beat.every || !beat.steps) continue;
      const last = beat.at + beat.every * (beat.steps - 1);
      if (ms < last) end = Math.max(end, last);
    }
    return end;
  },

  // A seek back across a tween renders its start, so a jump between two tweens of one value gets a 1 ms bridge.
  bridged<T extends { at: number; duration: number; from: V; to: V }, V>(tweens: T[], key: (tween: T) => string): T[] {
    const out: T[] = [];
    const last = new Map<string, T>();
    for (const tween of [...tweens].sort((a, b) => a.at - b.at)) {
      const previous = last.get(key(tween));
      if (previous && previous.to !== tween.from) out.push({ ...tween, at: tween.at - 1, duration: 1, from: previous.to, to: tween.from });
      out.push(tween);
      last.set(key(tween), tween);
    }
    return out;
  },

  rest(channels: Channel[]): Record<string, number> {
    const rest: Record<string, number> = {};
    for (const channel of [...channels].sort((a, b) => a.at - b.at)) {
      if (!(channel.name in rest)) rest[channel.name] = channel.from;
    }
    return rest;
  },
};

export const useReel = <S extends object>({ reel, mode, root, visible, visitor, beats: shown = [] }: ReelOptions<S>): ReelHandle<S> => {
  const beats = [...reel.beats].sort((a, b) => a.at - b.at);
  const sorted: Reel<S> = {
    ...reel,
    beats,
    channels: Reels.bridged(reel.channels, (channel) => channel.name),
    drawn: Reels.bridged(reel.drawn ?? [], (tween) => tween.selector),
  };
  const invite = useInvite();
  const view: { current: S } = shallowReactive({ current: Reels.replay(sorted, mode === "film" ? 0 : reel.loop.from) });
  const driver = ref<Driver>("demo");
  const reduced = ref(false);

  let timeline: Timeline | undefined;
  let signature = "";
  let pending: number | undefined;
  let handover: Timer | undefined;
  let rewinding = false;
  let fade: JSAnimation | undefined;
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
        // "replace" leaves a stale value when seeking back across two tweens of one property.
        { [`--${channel.name}`]: [channel.from, channel.to], duration: channel.duration, ease: channel.ease ?? MOTION_EASE.out, composition: "none" },
        channel.at,
      );
    }
    for (const tween of sorted.drawn ?? []) {
      const path = el.querySelector(tween.selector);
      if (!path) continue;
      built.add(
        svg.createDrawable(path),
        { draw: [tween.from, tween.to], duration: tween.duration, ease: tween.ease ?? MOTION_EASE.out, composition: "none" },
        tween.at,
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
    const out = animate(el, { "--loop": [1, 0], duration: 180, ease: MOTION_EASE.out, composition: "none" });
    fade = out;
    out.then(() => {
      // A Show me during the fade has already moved the playhead, so the loop start must not win.
      if (fade !== out) return;
      seek(reel.loop.from);
      fade = animate(el, { "--loop": [0, 1], duration: 300, ease: MOTION_EASE.out, composition: "none" });
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
    const from = timeline.currentTime;
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

  const restart = (ms: number): void => {
    if (mode === "film") return;
    handover?.pause();
    handover = undefined;
    live?.stop();
    live = undefined;
    driver.value = "demo";
    const el = root.value;
    if (!el) return;
    fade?.cancel();
    fade = undefined;
    rewinding = false;
    timeline = build(el);
    el.style.setProperty("--loop", "1");
    seek(ms);
    resume();
  };

  const playDemo = (): void => restart(reduced.value ? reel.still : reel.loop.from);

  // Under reduced motion nothing plays, so Show me holds the beat's moment instead of running up to it.
  const show = (id: string): void => {
    const beat = shown.find((one) => one.id === id);
    if (mode === "film" || !beat) return;
    invite.dismiss();
    restart(reduced.value ? beat.moment : beat.from);
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

  const draw: ReelHandle<S>["draw"] = (selector, to, { duration = 180, ease = MOTION_EASE.out } = {}) => {
    const path = root.value?.querySelector(selector);
    if (!path) return;
    animate(svg.createDrawable(path), { draw: to, duration: reduced.value ? 0 : duration, ease, composition: "none" });
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
    control: {
      driver: readonly(driver),
      take: () => {
        takeOver();
        // A take-over from the page's bar moves focus into the frame, because the toys only read keys while it is focused.
        root.value?.closest<HTMLElement>("[data-driver]")?.focus({ preventScroll: true });
      },
      demo: playDemo,
    },
    show,
    takeOver,
    ensureVisitor,
    playDemo,
    tween,
    draw,
  };
};
