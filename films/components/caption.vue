<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

const { at, until } = defineProps<{ at: number; until: number }>();

const caption = useTemplateRef<HTMLElement>("caption");
const { timeline } = useFilmContext();

onMounted(() => {
  if (!caption.value) return;
  timeline
    .add(caption.value, { opacity: [0, 1], y: [12, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at)
    .add(caption.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});
</script>

<template>
  <div class="film-caption-band">
    <p ref="caption" class="film-caption"><slot /></p>
  </div>
</template>

<style scoped>
.film-caption-band {
  @apply pointer-events-none absolute inset-x-0 bottom-16 flex justify-center;
}
.film-caption {
  @apply cela-glass rounded-full px-8 py-4 text-4xl font-bold tracking-tight opacity-0;
}
</style>
