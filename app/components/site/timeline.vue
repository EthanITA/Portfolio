<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { type JSAnimation, type ScrollObserver, animate, onScroll, stagger, svg } from "animejs";

import { screen } from "~/utils/scroll/frames";
import type { Product } from "~/utils/site/films";
import { SCRUB_SMOOTH, motionOn } from "~/utils/site/motion";

export type Bar = { value: number; share: number; note?: string };

export type Show =
  | { kind: "stills"; slugs: Product[] }
  | { kind: "count"; to: number; after?: string; label: string }
  | { kind: "bars"; bars: Bar[] };

export type Milestone = { when: string; what: string; show?: Show };

const SWAY = 14;
const BAR_MS = 600;
const BAR_STAGGER_MS = 120;
const STAGGER_MS = 80;

const { items } = defineProps<{ items: Milestone[] }>();

const root = useTemplateRef<HTMLElement>("root");
const path = useTemplateRef<SVGPathElement>("path");
const box = ref({ width: 0, height: 0 });
const d = ref("");
const reached = ref(items.map(() => true));
const lit = ref(items.length - 1);

let points: { x: number; y: number }[] = [];
let stops: number[] = [];
let draw: JSAnimation | undefined;
let scroller: ScrollObserver | undefined;
let resize: ResizeObserver | undefined;

const year = (when: string): number | undefined => (/^\d{4}$/.test(when) ? Number(when) : undefined);

const years = computed(() =>
  items.map((item, i) => {
    const to = year(item.when);
    const before = items.slice(0, i).map((one) => year(one.when)).filter((one): one is number => !!one).at(-1);
    return to ? { to, from: before ?? to } : undefined;
  }),
);

const nodes = (): HTMLElement[] => Array.from(root.value?.querySelectorAll<HTMLElement>("[data-node]") ?? []);

const trace = (): void => {
  const el = root.value;
  if (!el) return;
  const frame = el.getBoundingClientRect();
  points = nodes().map((node) => {
    const r = node.querySelector("[data-dot]")!.getBoundingClientRect();
    return { x: r.left + r.width / 2 - frame.left, y: r.top + r.height / 2 - frame.top };
  });
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return;
  box.value = { width: frame.width, height: frame.height };
  const curves = points.slice(1).map((point, i) => {
    const prev = points[i] ?? first;
    const mid = (prev.y + point.y) / 2;
    const sway = i % 2 === 0 ? SWAY : -SWAY;
    return `C ${prev.x + sway} ${mid} ${point.x + sway} ${mid} ${point.x} ${point.y}`;
  });
  d.value = [`M ${first.x} 0 L ${first.x} ${first.y}`, ...curves, `L ${last.x} ${frame.height}`].join(" ");
};

// Stops by path length, not height, so a node arrives only once the drawn head reaches it.
const measure = (): void => {
  const el = path.value;
  if (!el) return;
  const total = el.getTotalLength();
  stops = points.map(({ y }) => {
    let lo = 0;
    let hi = total;
    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2;
      if (el.getPointAtLength(mid).y < y) lo = mid;
      else hi = mid;
    }
    return hi / total;
  });
};

const arrive = (node: HTMLElement): void => {
  const dot = node.querySelector<HTMLElement>("[data-dot]");
  const rise = [...node.querySelectorAll<HTMLElement>("[data-enter]:not([data-dot])")];
  for (const el of [dot, ...rise]) if (el) el.dataset.entered = "";
  if (dot) animate(dot, { duration: MOTION_DURATION.base, ease: MOTION_EASE.out, opacity: [0, 1], scale: [0.95, 1] });
  animate(rise, { duration: MOTION_DURATION.base, delay: stagger(STAGGER_MS), ease: MOTION_EASE.out, opacity: [0, 1], translateY: [8, 0] });
  node.querySelectorAll<HTMLElement>("[data-fill]").forEach((fill, at) => {
    animate(fill, { scaleX: [0, Number(fill.dataset.fill)], duration: BAR_MS, delay: MOTION_DURATION.base + at * BAR_STAGGER_MS, ease: MOTION_EASE.out });
  });
};

const reach = (progress: number): void => {
  lit.value = stops.findLastIndex((stop) => progress >= stop);
  nodes().forEach((node, i) => {
    if (reached.value[i] || progress < (stops[i] ?? 1)) return;
    reached.value[i] = true;
    arrive(node);
  });
};

onMounted(async () => {
  trace();
  await nextTick();
  if (!root.value || !path.value || !motionOn()) return;
  measure();
  const [line] = svg.createDrawable(path.value);
  if (!line) return;
  reached.value = items.map(() => false);
  lit.value = -1;
  for (const fill of root.value.querySelectorAll<HTMLElement>("[data-fill]")) fill.style.transform = "scaleX(0)";
  scroller = onScroll({ target: root.value, enter: "center top", leave: "min+=50% bottom", sync: SCRUB_SMOOTH });
  draw = animate(line, { draw: ["0 0", "0 1"], ease: "linear", autoplay: scroller, onUpdate: (self) => reach(self.progress) });
  resize = new ResizeObserver(async () => {
    trace();
    await nextTick();
    measure();
    // onScroll resolves its target a frame after creation, and the observer's first callback can land before that.
    if (scroller?.target) scroller.refresh();
  });
  resize.observe(root.value);
});

onBeforeUnmount(() => {
  resize?.disconnect();
  draw?.revert();
  scroller?.revert();
});
</script>

<template>
  <div ref="root" class="timeline">
    <svg v-if="d" class="path" :viewBox="`0 0 ${box.width} ${box.height}`" :width="box.width" :height="box.height" aria-hidden="true">
      <path ref="path" data-path :d="d" />
    </svg>
    <ol class="items">
      <li v-for="(item, i) in items" :key="item.what" class="item" data-node :data-side="i % 2 === 0 ? 'left' : 'right'">
        <span class="dot" data-dot data-enter aria-hidden="true" />
        <span class="when" data-enter :data-lit="i === lit">
          <SiteCount v-if="years[i]" :to="years[i]!.to" :from="years[i]!.from" manual :go="reached[i]" />
          <template v-else>{{ item.when }}</template>
        </span>
        <p class="what">{{ item.what }}</p>
        <div v-if="item.show" class="show" data-enter>
          <div v-if="item.show.kind === 'stills'" class="stills" aria-hidden="true">
            <picture v-for="slug in item.show.slugs" :key="slug" class="still">
              <source type="image/avif" :srcset="screen(slug, 800, 'avif')" />
              <img class="image" :src="screen(slug, 800, 'webp')" width="800" height="500" alt="" loading="lazy" decoding="async" />
            </picture>
          </div>
          <p v-else-if="item.show.kind === 'count'" class="count">
            <SiteCount class="figure" :to="item.show.to" :after="item.show.after" manual :go="reached[i]" />
            <span class="label">{{ item.show.label }}</span>
          </p>
          <ul v-else class="bars">
            <li v-for="bar in item.show.bars" :key="bar.value" class="bar">
              <span class="track" aria-hidden="true"><span class="fill" :data-fill="bar.share" :style="{ '--share': bar.share }" /></span>
              <span class="value">{{ bar.value }}</span>
              <span v-if="bar.note" class="note">{{ bar.note }}</span>
            </li>
          </ul>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.timeline {
  @apply relative;
}

.path {
  @apply pointer-events-none absolute inset-0 overflow-visible text-primary;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.5;
}

.items {
  @apply relative m-0 flex list-none flex-col gap-14 p-0;
}

.item {
  @apply relative flex flex-col gap-2 ps-10 md:w-1/2;

  &[data-side="left"] {
    @apply md:items-end md:ps-0 md:pe-10 md:text-end;
  }

  &[data-side="right"] {
    @apply md:ms-auto md:ps-10;
  }
}

.dot {
  @apply absolute top-4.5 left-3 size-3 -translate-x-1/2 rounded-full bg-primary ring-4 ring-canvas;
}

.item[data-side="left"] .dot {
  @apply md:left-full;
}

.item[data-side="right"] .dot {
  @apply md:left-0;
}

.when {
  @apply font-mono text-5xl font-medium tracking-tight text-fg tabular-nums;

  &[data-lit="true"] {
    @apply text-primary;
  }
}

.what {
  @apply typo-body-lg m-0 max-w-sm text-pretty text-fg;
}

.show {
  @apply mt-2;
}

.stills {
  @apply flex gap-2;
}

.still {
  @apply block w-24 overflow-hidden rounded-field border border-border bg-sunken sm:w-28;
}

.image {
  @apply block aspect-16/10 h-auto w-full object-cover;
}

.count {
  @apply m-0 flex flex-col gap-1;
}

.figure {
  @apply font-mono text-2xl font-medium text-fg tabular-nums;
}

.label {
  @apply typo-body-md text-muted;
}

.bars {
  @apply m-0 flex list-none flex-col gap-2 p-0;
}

.bar {
  @apply flex items-center gap-3;
}

.item[data-side="left"] .bar {
  @apply md:flex-row-reverse;
}

.track {
  @apply relative h-2 w-40 overflow-hidden rounded-full bg-primary/15 sm:w-48;
}

.fill {
  @apply absolute inset-0 origin-left rounded-full bg-primary;
  transform: scaleX(var(--share));
}

.item[data-side="left"] .fill {
  @apply md:origin-right;
}

.value {
  @apply font-mono typo-body-md text-fg tabular-nums;
}

.note {
  @apply typo-body-md text-muted;
}
</style>
