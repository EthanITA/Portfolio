<template>
  <main class="film-frame" data-theme="light">
    <slot />
  </main>
</template>

<style scoped>
.film-frame {
  @apply relative h-screen w-screen overflow-hidden bg-base-200 font-sans text-base-content;
}
</style>
