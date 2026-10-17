<script setup lang="ts">
import type { FilmSeekable } from "~~/films/composables/film";
import script from "~~/films/scripts/shell";

const play = useTemplateRef<FilmSeekable>("play");

useFilm({ duration: script.duration, seek: (ms) => play.value?.seek(ms), ready: async () => play.value?.ready?.() });
</script>

<template>
  <FilmCut :script="script">
    <PlayShell ref="play" mode="film" />
  </FilmCut>
</template>
