<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { IslandMotion } from "~~/films/utils/island";

const { at } = defineProps<{ at: number }>();

const end = useTemplateRef<HTMLElement>("end");
const { timeline, cut } = useFilmContext();

onMounted(() => {
  if (!end.value) return;
  // The sheet times when the end text lands, so its tween starts its duration earlier.
  timeline.add(end.value, { opacity: [0, 1], y: [16, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at - MOTION_DURATION.base);
});
</script>

<template>
  <p ref="end" class="film-end" :style="{ top: `${IslandMotion.endTop(cut)}px` }"><slot /></p>
</template>

<style scoped>
.film-end {
  @apply absolute inset-x-0 text-center font-mono text-3xl opacity-0;
}
</style>
