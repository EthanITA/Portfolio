<template>
  <main class="film-frame" data-theme="light">
    <slot />
  </main>
</template>

<style scoped>
.film-frame {
  @apply relative h-screen w-screen overflow-hidden bg-canvas font-sans text-fg;
}
</style>
