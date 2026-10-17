<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { type JSAnimation, type ScrollObserver, animate, onScroll, svg } from "animejs";

import { SCRUB_SMOOTH, motionOn } from "~/utils/site/motion";

export type Milestone = { when: string; what: string };

const SWAY = 14;

const { items } = defineProps<{ items: Milestone[] }>();

const root = useTemplateRef<HTMLElement>("root");
const path = useTemplateRef<SVGPathElement>("path");
const box = ref({ width: 0, height: 0 });
const d = ref("");

let stops: number[] = [];
let draw: JSAnimation | undefined;
let scroller: ScrollObserver | undefined;
let resize: ResizeObserver | undefined;

const dots = (): HTMLElement[] => Array.from(root.value?.querySelectorAll<HTMLElement>("[data-dot]") ?? []);

const trace = (): void => {
  const el = root.value;
  if (!el) return;
  const frame = el.getBoundingClientRect();
  const points = dots().map((dot) => {
    const r = dot.getBoundingClientRect();
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
  stops = points.map((point) => point.y / frame.height);
};

const reach = (progress: number): void => {
  dots().forEach((dot, i) => {
    if ("entered" in dot.dataset || progress < (stops[i] ?? 1)) return;
    dot.dataset.entered = "";
    animate(dot, { duration: MOTION_DURATION.base, ease: MOTION_EASE.out, opacity: [0, 1], scale: [0.95, 1] });
  });
};

onMounted(async () => {
  trace();
  await nextTick();
  if (!root.value || !path.value || !motionOn()) return;
  const [line] = svg.createDrawable(path.value);
  if (!line) return;
  scroller = onScroll({
    target: root.value,
    enter: "center top",
    leave: "min+=50% bottom",
    sync: SCRUB_SMOOTH,
    onUpdate: (self) => reach(self.progress),
  });
  draw = animate(line, { draw: ["0 0", "0 1"], ease: "linear", autoplay: scroller });
  resize = new ResizeObserver(() => {
    trace();
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
      <li v-for="(item, i) in items" :key="item.what" class="item" :data-side="i % 2 === 0 ? 'left' : 'right'">
        <span class="dot" data-dot data-enter aria-hidden="true" />
        <span class="when">{{ item.when }}</span>
        <p class="what">{{ item.what }}</p>
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
  @apply relative m-0 flex list-none flex-col gap-10 p-0;
}

.item {
  @apply relative flex flex-col gap-1 ps-10 md:w-1/2;

  &[data-side="left"] {
    @apply md:items-end md:ps-0 md:pe-10 md:text-end;
  }

  &[data-side="right"] {
    @apply md:ms-auto md:ps-10;
  }
}

.dot {
  @apply absolute top-1.5 left-3 size-3 -translate-x-1/2 rounded-full bg-primary ring-4 ring-canvas;
}

.item[data-side="left"] .dot {
  @apply md:left-full;
}

.item[data-side="right"] .dot {
  @apply md:left-0;
}

.when {
  @apply typo-mono-meta text-primary;
}

.what {
  @apply typo-body-lg max-w-sm text-fg;
}
</style>
