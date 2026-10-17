<script setup lang="ts">
import { readSheet, SHEETS } from "~~/films/scripts/cues";
import { WINDOW, type FilmScript } from "~~/films/scripts/script";
import { VioletLine } from "~~/films/utils/line";

const { script } = defineProps<{ script: FilmScript }>();

const line = useTemplateRef<HTMLElement>("line");
const core = useTemplateRef<HTMLElement>("core");
const halo = useTemplateRef<HTMLElement>("halo");
const { onFrame, cut } = useFilmContext();

const anchors = readSheet({ script, json: SHEETS[script.name] }).sheet.lines.flatMap((spoken) => (spoken.anchor ? [spoken.anchor.beatMs] : []));

onFrame((ms) => {
  if (!line.value || !core.value || !halo.value) return;
  const { draw, glow, height, weight, opacity } = VioletLine.pose({ ms, anchors, stops: script.stops, fold: script.rig.until, close: script.close });
  line.value.style.opacity = String(opacity);
  line.value.style.transform = `scaleX(${draw})`;
  core.value.style.transform = `translateY(-50%) scaleY(${weight})`;
  halo.value.style.opacity = String(glow);
  halo.value.style.transform = `translateY(-50%) scaleY(${height})`;
});
</script>

<template>
  <div ref="line" class="film-line" :style="{ top: `${WINDOW[cut].y}px` }">
    <div ref="halo" class="film-line-halo" />
    <div ref="core" class="film-line-core" />
  </div>
</template>

<style scoped>
.film-line {
  @apply pointer-events-none absolute inset-x-0 h-0 origin-left;
}
.film-line-halo {
  @apply absolute inset-x-0 top-0 h-6 bg-linear-to-b from-transparent via-primary/30 to-transparent;
}
.film-line-core {
  @apply absolute inset-x-0 top-0 h-0.5 rounded-full bg-primary;
}
</style>
