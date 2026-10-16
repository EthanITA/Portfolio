<script setup lang="ts">
import type { FilmScript } from "~~/films/scripts/script";

const { script } = defineProps<{ script: FilmScript }>();
</script>

<template>
  <FilmFrame>
    <FilmRig :shots="script.rig.shots" :at="script.rig.at" :until="script.rig.until">
      <slot />
    </FilmRig>
    <FilmTitle :at="script.title.at" :until="script.title.until">{{ script.title.text }}</FilmTitle>
    <FilmCaption v-for="caption in script.captions" :key="caption.at" :at="caption.at" :until="caption.until">{{ caption.text }}</FilmCaption>
    <FilmEnd :at="script.end.at">{{ script.end.text }}</FilmEnd>
  </FilmFrame>
</template>
