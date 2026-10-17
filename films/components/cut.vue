<script setup lang="ts">
import type { FilmScript } from "~~/films/scripts/script";

const { script } = defineProps<{ script: FilmScript }>();

const presses = computed(() =>
  script.presses.map((press) => ({
    ...press,
    beside: script.captions.find((caption) => caption.at < press.until && press.at < caption.until)?.at.toString(),
  })),
);
</script>

<template>
  <FilmFrame>
    <FilmIsland :shots="script.island" />
    <FilmRig :shots="script.rig.shots" :at="script.rig.at" :until="script.rig.until">
      <slot />
    </FilmRig>
    <FilmTitle :at="script.title.at" :until="script.title.until" :tone="script.title.tone">{{ script.title.text }}</FilmTitle>
    <FilmCaption v-for="caption in script.captions" :key="caption.at" :at="caption.at" :until="caption.until" :data-caption="caption.at">{{ caption.text }}</FilmCaption>
    <FilmKey v-for="press in presses" :key="press.at" :keys="press.keys" :at="press.at" :until="press.until" :beside="press.beside" />
    <FilmEnd :at="script.end.at">{{ script.end.text }}</FilmEnd>
  </FilmFrame>
</template>
