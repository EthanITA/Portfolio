<script setup lang="ts">
import type { FilmSeekable } from "~/utils/stage/scene";

const scene = useTemplateRef<FilmSeekable>("scene");
const query = useRoute().query;
if (import.meta.client) document.documentElement.dataset.theme = query.theme === "dark" ? "dark" : "light";
// A tablet poster is the stage at its live size, inside a viewport wide enough to take the md layout the live tablet takes.
const [, width, height] = String(query.box ?? "").match(/^(\d+)x(\d+)$/) ?? [];
const box = width && height ? { width: `${width}px`, height: `${height}px` } : undefined;

useFilm({ duration: 16000, seek: (ms) => scene.value?.seek(ms), ready: () => scene.value?.ready() ?? Promise.resolve() });
</script>

<template>
  <main class="h-screen w-screen">
    <div class="size-full" :style="box">
      <StageLine ref="scene" mode="film" />
    </div>
  </main>
</template>
