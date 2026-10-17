<script setup lang="ts">
const { name } = defineProps<{ name: "hero" | "line" | "fence" | "play" }>();
</script>

<template>
  <div class="mount" :data-mount="name">
    <ClientOnly v-if="name === 'play'">
      <slot />
      <template #fallback>
        <div class="poster" aria-hidden="true" />
      </template>
    </ClientOnly>
    <slot v-else />
  </div>
</template>

<style scoped>
.mount {
  @apply relative w-full overflow-hidden rounded-box;

  & > :deep(*) {
    @apply absolute inset-0 size-full;
  }
}

.mount[data-mount="hero"] {
  @apply absolute inset-0 rounded-none;
}

.mount[data-mount="line"] {
  @apply h-[60svh] min-h-80 md:h-[70svh];
}

.mount[data-mount="fence"] {
  @apply h-[60svh] min-h-80 md:h-svh md:max-h-240;
}

.mount[data-mount="play"] {
  @apply aspect-3/4 min-h-[70svh] sm:aspect-16/10;
}

.poster {
  @apply bg-sunken;
}
</style>
