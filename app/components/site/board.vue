<script setup lang="ts">
import { Surface } from "@cela/design";
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { type Timeline, createTimeline, svg } from "animejs";

import { motionOn } from "~/utils/site/motion";

type Status = "completed" | "in_progress" | "pending";
type Line = { id: number; category: "AI" | "USER"; subject: string; status: Status };

const TICK_MS = 600;
const RISE = 6;

const lines: Line[] = [
  { id: 4, category: "AI", subject: "Crossfade the sequence frames", status: "completed" },
  { id: 5, category: "AI", subject: "Re-render the AI Shell film on fixed anchors", status: "in_progress" },
  { id: 6, category: "USER", subject: "Look at the sequence on a phone", status: "pending" },
];

const spoken: Record<Status, string> = { completed: "ticked", in_progress: "in progress", pending: "pending" };

const board = useTemplateRef<InstanceType<typeof Surface>>("board");
let observer: IntersectionObserver | undefined;
let ticks: Timeline | undefined;

const settle = (el: HTMLElement): void => {
  el.style.removeProperty("opacity");
  el.style.removeProperty("transform");
};

const tick = (root: HTMLElement): void => {
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
  const timeline = createTimeline({ onComplete: () => rows.forEach(settle) });
  rows.forEach((row, index) => {
    const at = index * TICK_MS;
    row.style.opacity = "0";
    row.dataset.ticked = "";
    timeline.add(row, { duration: MOTION_DURATION.base, ease: MOTION_EASE.out, opacity: [0, 1], translateY: [RISE, 0] }, at);
    const mark = row.querySelector<SVGGeometryElement>("[data-mark]");
    if (!mark) return;
    timeline.add(svg.createDrawable(mark, 0, 0), { duration: MOTION_DURATION.base, ease: MOTION_EASE.out, draw: ["0 0", "0 1"] }, at + MOTION_DURATION.fast);
  });
  ticks = timeline;
};

onMounted(() => {
  const root = board.value?.$el;
  if (!(root instanceof HTMLElement) || !motionOn()) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      tick(root);
    },
    { threshold: 0.5 },
  );
  observer.observe(root);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  ticks?.revert();
});
</script>

<template>
  <Surface ref="board" as="ul" variant="card" class="board">
    <li v-for="line in lines" :key="line.id" class="line" :data-line="line.status">
      <svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">
        <path v-if="line.status === 'completed'" data-mark d="M3 8.5l3.5 3.5L13 4.5" />
        <rect v-else-if="line.status === 'in_progress'" x="3" y="3" width="10" height="10" rx="2" />
        <rect v-else data-mark x="3.5" y="3.5" width="9" height="9" rx="2" />
      </svg>
      <span class="sr-only">{{ spoken[line.status] }}</span>
      <span class="text">
        <span class="tag">#{{ line.id }} [{{ line.category }}]</span>
        {{ line.subject }}
      </span>
    </li>
  </Surface>
</template>

<style scoped>
.board {
  @apply m-0 flex list-none flex-col gap-1 font-mono text-sm;
}

/* Hidden only while the ticks are still to play, the same gate main.css puts on entrances. */
@media screen {
  :root[data-motion="on"] .line:not([data-ticked]) {
    opacity: 0;
  }
}

.line {
  @apply flex items-start gap-3 py-1.5;
}

.glyph {
  @apply mt-0.5 size-4 shrink-0 text-muted;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

.line[data-line="completed"] .glyph {
  @apply text-primary;
}

.line[data-line="in_progress"] .glyph {
  @apply text-fg;
  fill: currentColor;
  stroke: none;
}

.text {
  @apply min-w-0 text-fg;
}

.line[data-line="completed"] .text {
  @apply text-muted line-through;
}

.line[data-line="in_progress"] .text {
  @apply font-medium;
}

.tag {
  @apply text-muted;
}
</style>
