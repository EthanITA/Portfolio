<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { splitText, stagger } from "animejs";
import { GRID } from "~~/films/scripts/script";

const { at, until, tone = "default" } = defineProps<{ at: number; until: number; tone?: "default" | "inverse" }>();

const title = useTemplateRef<HTMLElement>("title");
const { timeline } = useFilmContext();

onMounted(() => {
  if (!title.value) return;
  const { words } = splitText(title.value, { words: true });
  // The sheet times when a word lands, one beat apart, so each tween starts its duration earlier.
  timeline
    .add(words, { opacity: [0, 1], y: ["0.4em", "0em"], duration: MOTION_DURATION.base, ease: MOTION_EASE.out, delay: stagger(GRID.beatMs) }, at - MOTION_DURATION.base)
    .add(title.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});
</script>

<template>
  <h1 ref="title" class="film-title" :data-tone="tone"><slot /></h1>
</template>

<style scoped>
.film-title {
  @apply absolute top-1/2 left-0 w-full -translate-y-1/2 text-center text-8xl leading-none font-bold tracking-tight;
}
.film-title[data-tone="inverse"] {
  @apply text-raised;
}
.film-title :deep([data-word]) {
  @apply inline-block opacity-0;
}
</style>
