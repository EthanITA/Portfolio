<script setup lang="ts">
const scene = useTemplateRef("scene");
const theme = useRoute().query.theme === "dark" ? "dark" : "light";

useFilm({ duration: 6400, seek: (ms) => scene.value?.seek(ms), ready: () => scene.value?.ready() ?? Promise.resolve() });
onMounted(() => Object.assign(window, { __quads: () => scene.value?.quads() }));
</script>

<template>
  <ScrollSequenceScene ref="scene" :theme="theme" />
</template>
