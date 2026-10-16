<script setup lang="ts">
const { name } = defineProps<{ name: "hero" | "line" | "fence" | "play" }>();
</script>

<template>
  <div class="mount" :data-mount="name">
    <ClientOnly>
      <slot />
      <template #fallback>
        <div class="poster" aria-hidden="true" />
      </template>
    </ClientOnly>
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
  @apply aspect-4/3 sm:aspect-video;
}

.mount[data-mount="line"],
.mount[data-mount="fence"] {
  @apply aspect-4/5 sm:aspect-video;
}

.mount[data-mount="play"] {
  @apply aspect-3/4 sm:aspect-16/10;
}

.poster {
  @apply bg-sunken;
}
</style>
