<script setup lang="ts">
import { WINDOW, type FilmScript } from "~~/films/scripts/script";
import { IslandMotion } from "~~/films/utils/island";

const { script, radius } = defineProps<{ script: FilmScript; radius: number }>();

const glass = useTemplateRef<HTMLElement>("glass");
const { onFrame, cut } = useFilmContext();
const times = IslandMotion.times(script);

const box = { left: `${WINDOW[cut].x}px`, top: `${WINDOW[cut].y}px`, width: `${WINDOW[cut].width}px`, height: `${WINDOW[cut].height}px` };

onFrame((ms) => {
  if (glass.value) glass.value.style.opacity = String(1 - IslandMotion.pose({ ms, cut, times }).opacity);
});
</script>

<template>
  <div ref="glass" class="film-window" :style="{ ...box, borderRadius: `${radius}px` }">
    <slot />
  </div>
</template>

<style scoped>
/* The glass tokens without cela-glass's backdrop blur, which has only the flat canvas behind it to sample. */
.film-window {
  @apply absolute overflow-hidden opacity-0;
  background-color: var(--glass-bg);
  box-shadow:
    inset 0 0 0 1px var(--glass-border-color),
    var(--glass-shadow);
}
</style>
