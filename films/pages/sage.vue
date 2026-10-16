<script setup lang="ts">
import type { Seekable } from "#shared/types/seekable";
import script from "~~/films/scripts/sage";

const play = useTemplateRef<Seekable>("play");

useFilm({ duration: script.duration, seek: (ms) => play.value?.seek(ms) });
</script>

<template>
  <FilmCut :script="script">
    <PlaySage ref="play" mode="film" />
  </FilmCut>
</template>
