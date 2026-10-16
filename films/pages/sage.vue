<script setup lang="ts">
import type { Seekable } from "#shared/types/seekable";
import type { Shot } from "~~/films/utils/camera";

const SHOTS: Shot[] = [
  { at: 3000, duration: 1200, scale: 1.5, anchor: "notch" },
  { at: 22_000, duration: 1200, scale: 1.4, anchor: "card" },
  { at: 30_000, duration: 1400, scale: 1.5, anchor: "pay" },
  { at: 36_000, duration: 600, scale: 0.96 },
];

const play = useTemplateRef<Seekable>("play");

useFilm({ duration: 40_000, seek: (ms) => play.value?.seek(ms) });
</script>

<template>
  <FilmFrame>
    <FilmRig :shots="SHOTS" :until="36_000">
      <PlaySage ref="play" mode="film" />
    </FilmRig>
    <FilmTitle :at="600" :until="3000">Sage</FilmTitle>
    <FilmEnd :at="36_400">Sage · madong.me/sage</FilmEnd>
  </FilmFrame>
</template>
