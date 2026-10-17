<script setup lang="ts">
import { createFrames, sequencePath, type Drawable, type Frames } from "~/utils/scroll/frames";
import { MANIFEST } from "~/utils/scroll/manifest.gen";
import { BEAT_RANGES, beatStyle, cardOpacity, fitFrame, framePosition, SEQUENCE } from "~/utils/scroll/sequence";
import { createTiles, SCREENS, type Screen, type TileLayer, type Targets } from "~/utils/scroll/tiles";

const { beats, closing } = defineProps<{ beats: string[]; closing: string }>();

type State = "poster" | "live" | "paused" | "reduced";
type Phase = "frames" | "break" | "landed";

const LAST = SEQUENCE.frames - 1;

const root = useTemplateRef<HTMLElement>("root");
const stage = useTemplateRef<HTMLElement>("stage");
const frameCanvas = useTemplateRef<HTMLCanvasElement>("frameCanvas");
const tileCanvas = useTemplateRef<HTMLCanvasElement>("tileCanvas");
const linesBox = useTemplateRef<HTMLElement>("linesBox");

const state = ref<State>("poster");
const phase = ref<Phase>("frames");
const tilesReady = ref(false);
const targets = shallowRef<Targets>({});

defineExpose({ targets });

const srcset = (index: number, format: "avif" | "webp"): string =>
  [960, 1920].map((width) => `${sequencePath(`${width}/${String(index).padStart(3, "0")}`, format)} ${width}w`).join(", ");

const write = (element: HTMLElement, styles: { opacity?: string; transform?: string }): void => {
  for (const [property, value] of Object.entries(styles) as ["opacity" | "transform", string][]) {
    if (element.style[property] !== value) element.style[property] = value;
  }
};

let teardown = (): void => {};

const setup = (): void => {
  const section = root.value;
  const sticky = stage.value;
  const canvas = frameCanvas.value;
  const glCanvas = tileCanvas.value;
  const context = canvas?.getContext("2d");
  const lines = [...(linesBox.value?.querySelectorAll<HTMLElement>("[data-line]") ?? [])];
  if (!section || !sticky || !canvas || !glCanvas || !context) return;

  const mobile = matchMedia("(max-width: 767px)").matches;
  const pixelRatio = Math.min(devicePixelRatio, mobile ? 1.5 : 2);
  const width = mobile ? 960 : 1920;
  const grid = mobile ? ([12, 7] as const) : ([24, 14] as const);
  const cards = SCREENS.flatMap((screen) => [...document.querySelectorAll<HTMLElement>(`[data-flagship="${screen}"]`)]);

  const frames: Frames = createFrames({ width, onChange: () => schedule() });
  let tiles: TileLayer | undefined;
  let progress = 0;
  let scroll = scrollY;
  let box = { width: 0, height: 0 };
  let drawn: { bitmap?: ImageBitmap; next?: ImageBitmap; mix: string; fit: string } = { mix: "", fit: "" };
  let breakFrame: ImageBitmap | undefined;
  let stamped = { progress: "", frame: -1 };
  let documentTargets: Targets = {};
  let inView = false;
  let near = false;
  let pending = 0;
  let ticking = 0;
  let ticked = 0;
  let disposed = false;
  const idle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 1));

  // The pin is read from the live rect, never the smoothed p, so the stage appears in the frame it sticks.
  const pin = (): void => {
    const pinned = String(section.getBoundingClientRect().top <= 0);
    if (section.dataset.pinned !== pinned) section.dataset.pinned = pinned;
  };

  const exact = (index: number): Drawable | undefined => {
    const drawable = frames.best(index);
    return drawable?.index === index && !drawable.floor ? drawable : undefined;
  };

  const viewTargets = (): Targets =>
    Object.fromEntries(Object.entries(documentTargets).map(([screen, rect]) => [screen, { ...rect, y: rect.y - scroll }]));

  // Styles derive from p, not timeline tweens, which strand mid-value when the smoothing skips past their start.
  const draw = (): void => {
    const position = framePosition(progress);
    const index = Math.round(position);
    frames.focus(index);
    const low = Math.floor(position);
    const base = exact(low);
    // Frames sit 11 px of scroll apart on desktop, so the next one fades in by the remainder instead of snapping.
    const next = base && exact(low + 1);
    const drawable = base ?? frames.best(index);
    const mix = next ? (position - low).toFixed(2) : "";
    const fit = fitFrame({ ...box, safe: MANIFEST.safe, progress });
    const fitted = fit.width.toFixed(1);
    if (section.dataset.fit !== String(Math.round(fit.width))) section.dataset.fit = String(Math.round(fit.width));
    if (drawable && (drawable.bitmap !== drawn.bitmap || next?.bitmap !== drawn.next || mix !== drawn.mix || fitted !== drawn.fit)) {
      const rect = [fit.x * pixelRatio, fit.y * pixelRatio, fit.width * pixelRatio, fit.height * pixelRatio] as const;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(drawable.bitmap, ...rect);
      if (next && Number(mix) > 0) {
        context.globalAlpha = Number(mix);
        context.drawImage(next.bitmap, ...rect);
        context.globalAlpha = 1;
      }
      drawn = { bitmap: drawable.bitmap, next: next?.bitmap, mix, fit: fitted };
      if (state.value === "poster") state.value = inView ? "live" : "paused";
    }
    const last = frames.best(LAST);
    if (tiles && last && last.bitmap !== breakFrame) {
      breakFrame = last.bitmap;
      idle(() => !disposed && breakFrame === last.bitmap && tiles?.setFrame(last.bitmap));
    }
    phase.value = progress < SEQUENCE.breakAt ? "frames" : progress < 1 ? "break" : "landed";
    if (phase.value === "break" && tiles && tilesReady.value) tiles.render(progress, viewTargets());
    const fallback = phase.value === "break" && !tilesReady.value;
    canvas.style.opacity = fallback ? String(1 - Math.min((progress - SEQUENCE.breakAt) / (SEQUENCE.flownBy - SEQUENCE.breakAt), 1)) : "";
    const label = progress.toFixed(2);
    if (label !== stamped.progress) section.dataset.progress = label;
    if (index !== stamped.frame) section.dataset.frame = String(index);
    stamped = { progress: label, frame: index };
    lines.forEach((line, beat) => {
      const range = BEAT_RANGES[beat];
      if (!range) return;
      const { opacity, rise } = beatStyle(progress, range);
      write(line, { opacity: String(opacity), transform: `translateY(${rise.toFixed(2)}px)` });
      if (line.dataset.visible !== String(opacity > 0)) line.dataset.visible = String(opacity > 0);
    });
    for (const card of cards) write(card, { opacity: progress < 1 ? String(cardOpacity(progress)) : "" });
  };

  const schedule = (): void => {
    if (pending || disposed) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      draw();
    });
  };

  const measure = (): void => {
    const { width: boxWidth, height: boxHeight } = sticky.getBoundingClientRect();
    if (!boxWidth || !boxHeight) return;
    box = { width: boxWidth, height: boxHeight };
    canvas.width = Math.round(boxWidth * pixelRatio);
    canvas.height = Math.round(boxHeight * pixelRatio);
    drawn = { mix: "", fit: "" };
    tiles?.resize({ width: innerWidth, height: innerHeight, fit: fitFrame({ ...box, safe: MANIFEST.safe }) });
    scroll = scrollY;
    documentTargets = Object.fromEntries(
      SCREENS.flatMap((screen) => {
        const card = document.querySelector<HTMLElement>(`[data-flagship="${screen}"]`);
        const rect = (card?.querySelector<HTMLElement>("[data-flagship-poster]") ?? card)?.getBoundingClientRect();
        if (!rect?.width || !rect.height) return [];
        return [[screen, { x: rect.left, y: rect.top + scroll, width: rect.width, height: rect.height }]];
      }),
    );
    targets.value = documentTargets;
    section.dataset.targets = JSON.stringify(documentTargets, (_, value: unknown) => (typeof value === "number" ? Math.round(value) : value));
    draw();
    pin();
  };

  const loadStills = async (): Promise<void> => {
    await frames.loadFloor();
    await Promise.all(
      SCREENS.map(async (screen) => {
        const response = await fetch(sequencePath(`screens/${screen}-${mobile ? 800 : 1600}`, frames.format)).catch(() => undefined);
        const blob = response?.ok ? await response.blob() : undefined;
        const bitmap = blob && (await createImageBitmap(blob).catch(() => undefined));
        if (!bitmap) return;
        if (!disposed && tiles) tiles.setStill(screen, bitmap);
        bitmap.close();
      }),
    );
  };

  const approach = async (): Promise<void> => {
    if (near) return;
    near = true;
    void frames.loadAll();
    const layer = await createTiles({ canvas: glCanvas, grid, pixelRatio, onLost: () => (tilesReady.value = false) }).catch(() => undefined);
    if (!layer) return;
    if (disposed) return layer.dispose();
    tiles = layer;
    measure();
    await loadStills();
    tilesReady.value = !disposed && !layer.lost;
    schedule();
  };

  const goal = (): number => {
    const rect = section.getBoundingClientRect();
    return Math.min(Math.max(-rect.top / (rect.height - innerHeight), 0), 1);
  };

  // The lag runs on the page's clock, so the frame after a long one catches up instead of parking short of the scroll.
  const step = (now: number): void => {
    ticking = 0;
    const to = goal();
    progress = to + (progress - to) * Math.exp(-(ticked ? now - ticked : 1000 / 60) / SEQUENCE.lagMs);
    // A quarter of a frame, so the landing comes no later than anime's nudged lerp brought it.
    if (Math.abs(to - progress) < 0.001) progress = to;
    scroll = scrollY;
    draw();
    ticked = progress === to ? 0 : now;
    if (ticked) ticking = requestAnimationFrame(step);
  };

  const wake = (): void => {
    if (!ticking && !disposed) ticking = requestAnimationFrame(step);
  };

  const scrolled = (): void => {
    pin();
    wake();
  };

  // Seeding the playhead at the restored scroll keeps the smoothing from replaying the film on a reload mid-page.
  progress = goal();
  draw();
  pin();
  addEventListener("scroll", scrolled, { passive: true });

  const resize = new ResizeObserver(() => {
    measure();
    wake();
  });
  for (const element of [section, document.documentElement, ...cards]) resize.observe(element);

  const nearby = new IntersectionObserver(([entry]) => entry?.isIntersecting && void approach(), { rootMargin: "200% 0px" });
  nearby.observe(section);
  const visible = new IntersectionObserver(([entry]) => {
    inView = !!entry?.isIntersecting;
    if (state.value !== "poster") state.value = inView ? "live" : "paused";
  });
  visible.observe(section);

  idle(() => void (!disposed && frames.loadFloor()));

  teardown = () => {
    disposed = true;
    cancelAnimationFrame(pending);
    cancelAnimationFrame(ticking);
    removeEventListener("scroll", scrolled);
    delete section.dataset.pinned;
    for (const element of [...lines, ...cards]) write(element, { opacity: "", transform: "" });
    resize.disconnect();
    nearby.disconnect();
    visible.disconnect();
    frames.dispose();
    tiles?.dispose();
    tilesReady.value = false;
    phase.value = "frames";
    canvas.style.opacity = "";
  };
};

onMounted(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 767px)");
  const apply = (): void => {
    teardown();
    teardown = () => {};
    state.value = reduced.matches ? "reduced" : "poster";
    if (!reduced.matches) setup();
  };
  apply();
  reduced.addEventListener("change", apply);
  mobile.addEventListener("change", apply);
  onBeforeUnmount(() => {
    reduced.removeEventListener("change", apply);
    mobile.removeEventListener("change", apply);
    teardown();
  });
});
</script>

<template>
  <section
    ref="root"
    class="sequence"
    data-scene="sequence"
    :data-state="state"
    :data-phase="phase"
    :data-tiles="tilesReady"
    data-progress="0.00"
    data-frame="0"
  >
    <div ref="stage" class="stage">
      <picture class="poster">
        <source media="(prefers-reduced-motion: reduce), (scripting: none)" type="image/avif" :srcset="srcset(LAST, 'avif')" sizes="100vw" />
        <source media="(prefers-reduced-motion: reduce), (scripting: none)" type="image/webp" :srcset="srcset(LAST, 'webp')" sizes="100vw" />
        <source type="image/avif" :srcset="srcset(0, 'avif')" sizes="100vw" />
        <img :src="sequencePath('960/000', 'webp')" :srcset="srcset(0, 'webp')" sizes="100vw" width="1920" height="1080" alt="" loading="lazy" decoding="async" />
      </picture>
      <canvas ref="frameCanvas" class="frames" aria-hidden="true" />
      <div ref="linesBox" class="lines">
        <p v-for="beat in beats" :key="beat" class="line" data-line data-visible="false">{{ beat }}</p>
        <p class="line closing" data-line data-visible="false">{{ closing }}</p>
      </div>
    </div>
    <canvas ref="tileCanvas" class="tiles" aria-hidden="true" />
  </section>
</template>

<style scoped>
.sequence {
  @apply relative -mb-[100svh] h-[400svh] max-md:h-[300svh];
}

.stage {
  @apply pointer-events-none sticky top-0 h-svh w-full overflow-hidden bg-canvas transition-[opacity,visibility] duration-(--duration-fast) ease-(--ease-out);
}

.sequence[data-pinned="false"] .stage {
  @apply invisible opacity-0;
}

.poster,
.frames {
  @apply absolute inset-0 size-full;
}

.poster img {
  @apply size-full object-cover;
}

.lines {
  @apply absolute inset-x-0 bottom-[18svh] flex justify-center px-6;
}

.line {
  @apply typo-display absolute bottom-0 m-0 max-w-4xl text-center text-4xl text-balance opacity-0 sm:text-5xl lg:text-6xl;
}

.closing {
  @apply bottom-[56svh];
}

.tiles {
  @apply pointer-events-none invisible fixed inset-0 z-40 size-full;
}

.sequence[data-state="live"] .poster,
.sequence[data-state="paused"] .poster,
.sequence[data-phase="landed"] .frames,
.sequence[data-phase="break"][data-tiles="true"] .frames {
  @apply invisible;
}

.sequence[data-phase="break"][data-tiles="true"] .tiles {
  @apply visible;
}

@media (prefers-reduced-motion: reduce), (scripting: none) {
  .sequence {
    @apply mb-0 h-auto;
  }

  .stage {
    @apply static flex h-auto flex-col items-center gap-6 overflow-visible;
  }

  .poster {
    @apply relative block aspect-video h-auto max-h-[65svh] w-auto max-w-full;
  }

  .frames,
  .tiles {
    @apply hidden;
  }

  .lines {
    @apply static flex-col items-center gap-3;
  }

  .line {
    @apply static text-3xl opacity-100 sm:text-4xl;
  }
}
</style>
