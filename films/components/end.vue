<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

const { at } = defineProps<{ at: number }>();

const end = useTemplateRef<HTMLElement>("end");
const { timeline } = useFilmContext();

onMounted(() => {
  if (!end.value) return;
  timeline.add(end.value, { opacity: [0, 1], y: [16, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at);
});
</script>

<template>
  <p ref="end" class="film-end"><slot /></p>
</template>

<style scoped>
.film-end {
  @apply absolute inset-x-0 top-2/3 text-center font-mono text-3xl opacity-0;
}
</style>
