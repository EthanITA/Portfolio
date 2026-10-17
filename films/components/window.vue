<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { WINDOW } from "~~/films/scripts/script";

const { at, until } = defineProps<{ at?: number; until: number }>();

const glass = useTemplateRef<HTMLElement>("glass");
const { timeline, cut } = useFilmContext();

const box = { left: `${WINDOW[cut].x}px`, top: `${WINDOW[cut].y}px`, width: `${WINDOW[cut].width}px`, height: `${WINDOW[cut].height}px` };

onMounted(() => {
  if (!glass.value) return;
  if (at) timeline.add(glass.value, { opacity: [0, 1], duration: MOTION_DURATION.slower, ease: MOTION_EASE.inOut }, at);
  timeline.add(glass.value, { opacity: [1, 0], duration: MOTION_DURATION.slower, ease: MOTION_EASE.inOut }, until);
});
</script>

<template>
  <div ref="glass" class="film-window" :style="box">
    <slot />
  </div>
</template>

<style scoped>
/* The glass tokens without cela-glass's backdrop blur, which has only the flat canvas behind it to sample. */
.film-window {
  @apply absolute overflow-hidden rounded-selector;
  background-color: var(--glass-bg);
  box-shadow:
    inset 0 0 0 1px var(--glass-border-color),
    var(--glass-shadow);
}
</style>
