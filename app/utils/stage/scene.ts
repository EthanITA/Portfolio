import type { SceneMode, Seekable } from "#shared/types/seekable";

import { MOTION_DURATION, MOTION_EASE, animate } from "@cela/design/utils/motion";

import { currentTheme } from "./theme";
import type { StageTheme } from "./theme";

export type SceneState = "poster" | "live" | "paused" | "reduced";

export type SceneRuntime = {
  frame: (ms: number, dt: number) => boolean;
  theme: (instant: boolean) => Promise<StageTheme>;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

export type SceneSetup = (o: { canvas: HTMLCanvasElement; film: boolean; mobile: boolean }) => Promise<SceneRuntime>;

export type SceneOptions = {
  mode: SceneMode;
  duration: number;
  root: () => HTMLElement | undefined;
  box?: () => HTMLElement | undefined;
  canvas: () => HTMLCanvasElement | undefined;
  setup: SceneSetup;
  reducedOnDemand?: boolean;
  start?: number;
};

export type FilmSeekable = Seekable & { ready: () => Promise<void> };

export type Scene = {
  state: Ref<SceneState>;
  theme: Ref<StageTheme>;
  reduced: Ref<boolean>;
  clock: () => number;
  kick: () => Promise<void>;
  wake: () => void;
  seekable: FilmSeekable;
};

const LIVE_RATIO = 0.1;
const MAX_DT = 100;

export const useScene = ({ mode, duration, root, box = root, canvas, setup, reducedOnDemand, start = 0 }: SceneOptions): Scene => {
  const film = mode === "film";
  const state = ref<SceneState>("poster");
  const theme = ref<StageTheme>("light");
  const reduced = ref(false);

  let runtime: SceneRuntime | undefined;
  let booting: Promise<SceneRuntime | undefined> | undefined;
  let failed = false;
  let disposed = false;
  let inView = false;
  let pageVisible = true;
  let shown = false;
  let busy = true;
  let clock = start;
  let last = 0;
  let raf = 0;

  // A frame returning false parks the loop until wake, kick or a theme change, so a still scene renders nothing.
  const running = (): boolean => !!runtime && inView && pageVisible && busy && (!reduced.value || !!reducedOnDemand);

  const stamp = (): void => {
    if (reduced.value && !film) state.value = "reduced";
    else if (!runtime) state.value = "poster";
    else state.value = film || running() ? "live" : "paused";
  };

  const reveal = (): void => {
    const el = canvas();
    if (shown || !el) return;
    shown = true;
    if (film || reduced.value) el.style.opacity = "1";
    else animate(el, { opacity: [0, 1], duration: MOTION_DURATION.base, ease: MOTION_EASE.out });
  };

  const draw = (dt: number): void => {
    if (!runtime) return;
    busy = runtime.frame(clock, dt);
    reveal();
  };

  const tick = (now: number): void => {
    raf = 0;
    if (!running()) {
      last = 0;
      stamp();
      return;
    }
    const dt = last ? now - last : 0;
    last = now;
    clock += Math.min(dt, MAX_DT);
    draw(dt);
    raf = requestAnimationFrame(tick);
  };

  const sync = (): void => {
    stamp();
    if (running() && !raf) raf = requestAnimationFrame(tick);
  };

  const boot = (): Promise<SceneRuntime | undefined> => {
    const el = canvas();
    if (booting || failed || !el) return booting ?? Promise.resolve(runtime);
    booting = setup({ canvas: el, film, mobile: matchMedia("(pointer: coarse)").matches })
      .then((created) => {
        if (disposed) {
          created.dispose();
          return undefined;
        }
        runtime = created;
        const size = box()?.getBoundingClientRect();
        if (size) runtime.resize(size.width, size.height);
        if (film) draw(0);
        sync();
        return created;
      })
      .catch(() => {
        failed = true;
        return undefined;
      });
    return booting;
  };

  const wake = (): void => {
    busy = true;
    sync();
  };

  const kick = async (): Promise<void> => {
    await boot();
    wake();
  };

  const seekable: FilmSeekable = {
    duration,
    seek: (ms) => {
      if (disposed) return;
      clock = Math.max(0, ms);
      draw(0);
    },
    ready: async () => {
      await boot();
    },
  };

  const cleanups: (() => void)[] = [];

  onMounted(() => {
    const el = root();
    if (!el) return;
    theme.value = currentTheme();

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = (): void => {
      reduced.value = !film && motion.matches;
      const surface = canvas();
      if (reduced.value && surface && !reducedOnDemand) {
        surface.style.opacity = "0";
        shown = false;
      }
      sync();
    };
    onMotion();
    motion.addEventListener("change", onMotion);
    cleanups.push(() => motion.removeEventListener("change", onMotion));

    const onTheme = (): void => {
      const next = currentTheme();
      if (!runtime) {
        theme.value = next;
        return;
      }
      busy = true;
      const instant = film || !running();
      void runtime.theme(instant).then((applied) => {
        if (!disposed) theme.value = applied;
      });
      if (instant) draw(0);
      else sync();
    };
    const themes = new MutationObserver(onTheme);
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    cleanups.push(() => themes.disconnect());

    const sizes = new ResizeObserver(([entry]) => {
      if (!entry || !runtime) return;
      runtime.resize(entry.contentRect.width, entry.contentRect.height);
      if (shown) draw(0);
    });
    sizes.observe(box() ?? el);
    cleanups.push(() => sizes.disconnect());

    if (film) {
      void boot();
      return;
    }

    const onVisibility = (): void => {
      pageVisible = document.visibilityState === "visible";
      sync();
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

    const view = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        inView = entry.isIntersecting && entry.intersectionRatio >= LIVE_RATIO;
        if (entry.isIntersecting && !reduced.value) void boot();
        sync();
      },
      { threshold: [0, LIVE_RATIO] },
    );
    view.observe(el);
    cleanups.push(() => view.disconnect());

    const surface = canvas();
    const onLost = (): void => {
      failed = true;
      runtime?.dispose();
      runtime = undefined;
      shown = false;
      if (surface) surface.style.opacity = "0";
      sync();
    };
    surface?.addEventListener("webglcontextlost", onLost);
    cleanups.push(() => surface?.removeEventListener("webglcontextlost", onLost));
  });

  onBeforeUnmount(() => {
    disposed = true;
    cancelAnimationFrame(raf);
    cleanups.forEach((cleanup) => cleanup());
    runtime?.dispose();
    runtime = undefined;
  });

  return { state, theme, reduced, clock: () => clock, kick, wake, seekable };
};
