<script setup lang="ts">
// Stamped in setup, before the player mounts, because the player reads its palette from <html> when it mounts.
document.documentElement.dataset.theme = useRoute().query.theme === "dark" ? "dark" : "light";
</script>

<template>
  <main class="film-bare">
    <slot />
  </main>
</template>

<style scoped>
.film-bare {
  @apply relative h-screen w-screen overflow-hidden bg-base-200 text-base-content;
}
</style>
