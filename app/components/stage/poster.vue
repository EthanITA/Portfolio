<script setup lang="ts">
import type { StageTheme } from "~/utils/stage/theme";

type PosterName = "hero" | "lost" | "line" | "fence";

const { name, theme, eager = false } = defineProps<{ name: PosterName; theme: StageTheme; eager?: boolean }>();

// Only scenes whose posters tools/render has written to public/stage are listed, so no poster request can 404.
const RENDERED: Partial<Record<PosterName, { width: number; height: number; mobile: boolean }>> = {};

const size = computed(() => RENDERED[name]);
</script>

<template>
  <div class="poster" aria-hidden="true">
    <picture v-if="size" :key="theme" class="picture">
      <source v-if="size.mobile" media="(max-width: 767px)" :srcset="`/stage/${name}-mobile-${theme}.webp`" />
      <img
        class="image"
        :src="`/stage/${name}-${theme}.webp`"
        :width="size.width"
        :height="size.height"
        alt=""
        :loading="eager ? 'eager' : 'lazy'"
        decoding="async"
        :fetchpriority="eager ? 'high' : 'auto'"
      />
    </picture>
  </div>
</template>

<style scoped>
.poster {
  @apply absolute inset-0 bg-canvas;
}

.picture {
  @apply absolute inset-0;
}

.image {
  @apply size-full object-cover;
}
</style>
