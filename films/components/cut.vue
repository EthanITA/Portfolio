<script setup lang="ts">
import type { FilmScript } from "~~/films/scripts/script";

const { script } = defineProps<{ script: FilmScript }>();

const radius = ref(0);
</script>

<template>
  <FilmFrame>
    <FilmIsland :script="script" @radius="radius = $event" />
    <FilmWindow :script="script" :radius="radius">
      <FilmRig :shots="script.rig.shots" :at="script.rig.at" :until="script.rig.until">
        <slot />
        <FilmRule v-for="rule in script.rules" :key="rule.at" :anchor="rule.anchor" :at="rule.at" />
      </FilmRig>
    </FilmWindow>
    <div class="film-over">
      <FilmLine :script="script" />
      <FilmSky :script="script" />
      <FilmTitle :text="script.title.text" :at="script.title.at" :until="script.title.until" :tone="script.title.tone" />
      <FilmEnd :at="script.end.at">{{ script.end.text }}</FilmEnd>
    </div>
  </FilmFrame>
</template>

<style scoped>
/* One frame-sized layer over the window, or Chrome squashes these into layers whose shifting bounds raster differently by what was seeked before. */
.film-over {
  @apply absolute inset-0 will-change-transform;
}
</style>
