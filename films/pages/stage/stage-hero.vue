<script setup lang="ts">
import type { FilmSeekable } from "~/utils/stage/scene";

const scene = useTemplateRef<FilmSeekable>("scene");
const { theme, lost } = useRoute().query;
if (import.meta.client) document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";

useFilm({ duration: 3300, seek: (ms) => scene.value?.seek(ms), ready: () => scene.value?.ready() ?? Promise.resolve() });
</script>

<template>
  <main class="h-screen w-screen">
    <StageHero ref="scene" mode="film" :lost="lost === '1'" />
  </main>
</template>
