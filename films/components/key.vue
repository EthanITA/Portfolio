<script setup lang="ts">
import { Kbd } from "@cela/design";
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

const { keys, at, until, beside } = defineProps<{ keys: string; at: number; until: number; beside?: string }>();

const GAP = 24;

const band = useTemplateRef<HTMLElement>("band");
const key = useTemplateRef<HTMLElement>("key");
const { timeline, onFrame } = useFilmContext();

onMounted(() => {
  if (!key.value) return;
  timeline
    .add(key.value, { opacity: [0, 1], y: [12, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at)
    .add(key.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});

let placed = false;

// Placed on the first frame rather than at mount, because the caption's width is only final once its font has loaded.
onFrame(() => {
  if (placed || !band.value || !key.value) return;
  placed = true;
  const caption = beside ? band.value.parentElement?.querySelector(`[data-caption="${beside}"] .film-caption`) : undefined;
  if (!caption) return;
  const shift = caption.getBoundingClientRect().width / 2 + GAP + key.value.getBoundingClientRect().width / 2;
  band.value.style.translate = `${-shift}px 0`;
});
</script>

<template>
  <div ref="band" class="film-key-band">
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
