<script setup lang="ts">
import { MOTION_EASE } from "@cela/design/utils/motion";
import { type JSAnimation, animate } from "animejs";

const DRAW_MS = 800;

const { share, play = false } = defineProps<{ share: number; play?: boolean }>();

const fill = useTemplateRef<HTMLElement>("fill");
let draw: JSAnimation | undefined;

watch(
  () => play,
  (now) => {
    if (!now || !fill.value || draw) return;
    fill.value.dataset.drawn = "";
    draw = animate(fill.value, { duration: DRAW_MS, ease: MOTION_EASE.out, scaleX: [0, 1] });
  },
);

onBeforeUnmount(() => draw?.revert());
</script>

<template>
  <span class="track" aria-hidden="true">
    <span ref="fill" class="fill" :style="{ width: `${share * 100}%` }" />
  </span>
</template>

<style scoped>
.track {
  @apply block h-1.5 w-full overflow-hidden rounded-full bg-primary-soft;
}

.fill {
  @apply block h-full origin-left rounded-full bg-primary;
}

/* Empty only while the draw is still to play, so a bar seen before its number never shows full first. */
@media screen {
  :root[data-motion="on"] .fill:not([data-drawn]) {
    transform: scaleX(0);
  }
}
</style>
