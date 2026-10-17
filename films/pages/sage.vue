<script setup lang="ts">
import type { FilmSeekable } from "~~/films/composables/film";
import { voiceOf } from "~~/films/scripts/cues";
import script from "~~/films/scripts/sage";

const play = useTemplateRef<FilmSeekable>("play");
const voice = voiceOf("sage");

useFilm({ duration: script.duration, seek: (ms) => play.value?.seek(ms), ready: async () => play.value?.ready?.() });
</script>

<template>
  <FilmCut :script="script" :voice="voice">
    <PlaySage ref="play" mode="film" />
  </FilmCut>
</template>
