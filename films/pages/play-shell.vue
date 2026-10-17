<script setup lang="ts">
import type { FilmSeekable } from "~~/films/composables/film";

const play = useTemplateRef<FilmSeekable>("play");

useFilm({
  get duration() {
    return play.value?.duration ?? 0;
  },
  seek: (ms) => play.value?.seek(ms),
  ready: async () => play.value?.ready?.(),
});
</script>

<template>
  <FilmBare>
    <PlayShell ref="play" mode="film" />
  </FilmBare>
</template>
