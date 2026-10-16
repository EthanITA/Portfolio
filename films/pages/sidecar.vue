<script setup lang="ts">
import type { Seekable } from "#shared/types/seekable";
import type { Shot } from "~~/films/utils/camera";

const SHOTS: Shot[] = [
  { at: 0, duration: 0, scale: 0.96 },
  { at: 2600, duration: 900, scale: 1 },
  { at: 10_000, duration: 1400, scale: 1.4, anchor: "review" },
  { at: 14_500, duration: 1400, scale: 1.2, anchor: "terminal" },
  { at: 18_000, duration: 1500, scale: 1.5, anchor: "artifacts" },
  { at: 24_500, duration: 1600, scale: 1.1 },
  { at: 28_200, duration: 1400, scale: 1.4, anchor: "history" },
  { at: 34_000, duration: 3000, scale: 0.9 },
  { at: 41_000, duration: 600, scale: 0.86 },
];

const play = useTemplateRef<Seekable>("play");

useFilm({ duration: 45_000, seek: (ms) => play.value?.seek(ms) });
</script>

<template>
  <FilmFrame>
    <FilmRig :shots="SHOTS" :at="2600" :until="41_000">
      <PlaySidecar ref="play" mode="film" />
    </FilmRig>
    <FilmTitle :at="1000" :until="3000">Sidecar</FilmTitle>
    <FilmCaption :at="1600" :until="3000">A companion window for Claude Code.</FilmCaption>
    <FilmCaption :at="34_600" :until="40_600">Claude does the work. You decide what lands.</FilmCaption>
    <FilmEnd :at="41_400">Sidecar · madong.me/sidecar</FilmEnd>
  </FilmFrame>
</template>
