<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { splitText, stagger } from "animejs";

const { at, until, tone = "default" } = defineProps<{ at: number; until: number; tone?: "default" | "inverse" }>();

const title = useTemplateRef<HTMLElement>("title");
const { timeline } = useFilmContext();

onMounted(() => {
  if (!title.value) return;
  const { words } = splitText(title.value, { words: true });
  timeline
    .add(words, { opacity: [0, 1], y: ["0.4em", "0em"], duration: MOTION_DURATION.base, ease: MOTION_EASE.out, delay: stagger(40) }, at)
    .add(title.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});
</script>

<template>
  <h1 ref="title" class="film-title" :data-tone="tone"><slot /></h1>
</template>

<style scoped>
.film-title {
  @apply absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-8xl leading-none font-bold tracking-tight;
}
.film-title[data-tone="inverse"] {
  @apply text-base-100;
}
.film-title :deep([data-word]) {
  @apply inline-block opacity-0;
}
</style>
