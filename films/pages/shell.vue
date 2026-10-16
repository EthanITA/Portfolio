<script setup lang="ts">
import type { Seekable } from "#shared/types/seekable";
import type { Shot } from "~~/films/utils/camera";

const SHOTS: Shot[] = [
  { at: 3200, duration: 1400, scale: 1.35, anchor: "line" },
  { at: 9800, duration: 900, scale: 1.15 },
  { at: 10_700, duration: 1200, scale: 1.35, anchor: "line" },
  { at: 17_800, duration: 900, scale: 1.15 },
  { at: 18_700, duration: 1200, scale: 1.35, anchor: "line" },
  { at: 26_800, duration: 900, scale: 1.15 },
  { at: 27_700, duration: 1200, scale: 1.35, anchor: "line" },
  { at: 31_800, duration: 900, scale: 1 },
];

const play = useTemplateRef<Seekable>("play");

useFilm({ duration: 35_000, seek: (ms) => play.value?.seek(ms) });
</script>

<template>
  <FilmFrame>
    <FilmRig :shots="SHOTS" :at="2400" :until="32_000">
      <PlayShell ref="play" mode="film" />
    </FilmRig>
    <FilmTitle :at="600" :until="3000">AI Shell</FilmTitle>
    <FilmCaption :at="3400" :until="9800">Looks: runs</FilmCaption>
    <FilmCaption :at="10_400" :until="17_800">Changes: waits for Enter</FilmCaption>
    <FilmCaption :at="18_400" :until="26_800">Can't be undone: asks first</FilmCaption>
    <FilmCaption :at="27_400" :until="31_800">One answer from a pipe</FilmCaption>
    <FilmEnd :at="32_400">AI Shell · madong.me/shell</FilmEnd>
  </FilmFrame>
</template>
