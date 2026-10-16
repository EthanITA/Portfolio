<script setup lang="ts">
import type { StageTheme } from "~/utils/stage/theme";

type PosterName = "hero" | "lost" | "line" | "fence";

const { name, eager = false } = defineProps<{ name: PosterName; eager?: boolean }>();

// Only scenes whose posters tools/render has written to public/stage are listed, so no poster request can 404.
const RENDERED: Partial<Record<PosterName, { width: number; height: number; mobile: boolean }>> = {};

const themes: StageTheme[] = ["light", "dark"];
const size = computed(() => RENDERED[name]);
</script>

<template>
  <div class="poster" aria-hidden="true">
    <template v-if="size">
      <picture v-for="theme in themes" :key="theme" class="stage-poster" :data-for="theme">
        <source v-if="size.mobile" media="(max-width: 767px)" :srcset="`/stage/${name}-mobile-${theme}.webp`" />
        <img
          class="image"
          :src="`/stage/${name}-${theme}.webp`"
          :width="size.width"
          :height="size.height"
          alt=""
          loading="lazy"
          decoding="async"
          :fetchpriority="eager ? 'high' : 'auto'"
        />
      </picture>
    </template>
  </div>
</template>

<style scoped>
.poster {
  @apply absolute inset-0 bg-canvas;
}

.stage-poster {
  @apply absolute inset-0;
}

.image {
  @apply size-full object-cover;
}

:global(:root[data-theme="dark"] .stage-poster[data-for="light"]),
:global(:root[data-theme="light"] .stage-poster[data-for="dark"]) {
  @apply hidden;
}

@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme]) .stage-poster[data-for="light"]) {
    @apply hidden;
  }
}

@media (prefers-color-scheme: light) {
  :global(:root:not([data-theme]) .stage-poster[data-for="dark"]) {
    @apply hidden;
  }
}
</style>
