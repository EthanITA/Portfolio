<script setup lang="ts">
import type { FilmSeekable } from "~/utils/stage/scene";

const scene = useTemplateRef<FilmSeekable>("scene");
if (import.meta.client) document.documentElement.dataset.theme = useRoute().query.theme === "dark" ? "dark" : "light";

useFilm({ duration: 32000, seek: (ms) => scene.value?.seek(ms), ready: () => scene.value?.ready() ?? Promise.resolve() });
</script>

<template>
  <main class="h-screen w-screen">
    <StageFence ref="scene" mode="film" />
  </main>
</template>
