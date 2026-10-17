<script setup lang="ts">
import { Kbd } from "@cela/design";
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

const { keys, at, until } = defineProps<{ keys: string; at: number; until: number }>();

const key = useTemplateRef<HTMLElement>("key");
const { timeline } = useFilmContext();

onMounted(() => {
  if (!key.value) return;
  timeline
    .add(key.value, { opacity: [0, 1], y: [12, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at)
    .add(key.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});
</script>

<template>
  <div class="film-key-band">
    <div ref="key" class="film-key">
      <Kbd class="film-key-caps" :keys="keys" />
    </div>
  </div>
</template>

<style scoped>
.film-key-band {
  @apply pointer-events-none absolute inset-x-0 bottom-16 flex h-18 items-center justify-center;
}
.film-key {
  @apply opacity-0;
}
.film-key-caps {
  @apply scale-300;
}
</style>
