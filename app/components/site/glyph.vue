<script setup lang="ts">
import { MOTION_EASE } from "@cela/design/utils/motion";
import { animate, svg } from "animejs";

import { motionOn } from "~/utils/site/motion";
import type { GlyphName } from "~/utils/site/text";

const PATHS: Record<GlyphName, string> = {
  asks: "M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.2V15M12 19h.01",
  changes: "M4 20l4-1L19 8l-3-3L5 16l-1 4zM14 7l3 3",
  comments: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  follows: "M4 17c4 0 5-10 10-10h6M17 4l3 3-3 3",
  hands: "M5 7h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9 11h6",
  looks: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  pipe: "M12 3v18M7 9l-3 3 3 3M17 9l3 3-3 3",
  review: "M4 12.5l5 5L20 6.5",
  steps: "M4 7l2 2 3-3M4 15l2 2 3-3M12 8h8M12 16h8",
  talk: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3",
  undone: "M8 3h8l5 5v8l-5 5H8l-5-5V8zM8 12h8",
};

const DRAW_MS = 600;

const { name } = defineProps<{ name: GlyphName }>();

const path = useTemplateRef<SVGPathElement>("path");
let observer: IntersectionObserver | undefined;
let host: Element | undefined;
let drawable: ReturnType<typeof svg.createDrawable> | undefined;

const draw = (): void => {
  if (!drawable) return;
  animate(drawable, { draw: ["0 0", "0 1"], duration: DRAW_MS, ease: MOTION_EASE.out });
};

const fine = (): boolean => matchMedia("(hover: hover) and (pointer: fine)").matches;
const onHost = (): void => {
  if (fine()) draw();
};

onMounted(() => {
  if (!path.value || !motionOn()) return;
  drawable = svg.createDrawable(path.value, 0, 0);
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      draw();
    },
    { threshold: 0.6 },
  );
  observer.observe(path.value);
  host = path.value.closest("[data-glyph-host]") ?? undefined;
  host?.addEventListener("pointerenter", onHost);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  host?.removeEventListener("pointerenter", onHost);
});
</script>

<template>
  <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
    <path ref="path" :d="PATHS[name]" />
  </svg>
</template>

<style scoped>
.glyph {
  @apply size-6 shrink-0 text-primary;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}
</style>
