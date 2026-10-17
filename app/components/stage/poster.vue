<script setup lang="ts">
import type { StageTheme } from "~/utils/stage/theme";

type PosterName = "hero" | "lost" | "line" | "fence";

const { name, theme, eager = false } = defineProps<{ name: PosterName; theme: StageTheme; eager?: boolean }>();

type Size = { width: number; height: number };

// Must match the size and scale each poster is rendered at in public/stage, or the img reserves the wrong box.
const RENDERED: Record<PosterName, Size & { mobile?: Size }> = {
  hero: { width: 1920, height: 1080, mobile: { width: 1920, height: 1080 } },
  lost: { width: 1920, height: 1080 },
  line: { width: 1920, height: 1080, mobile: { width: 800, height: 1000 } },
  fence: { width: 1920, height: 1080 },
};

const size = computed(() => RENDERED[name]);
</script>

<template>
  <div class="poster" aria-hidden="true">
    <picture :key="theme" class="picture">
      <source
        v-if="size.mobile"
        media="(max-width: 767px)"
        :srcset="`/stage/${name}-mobile-${theme}.webp`"
        :width="size.mobile.width"
        :height="size.mobile.height"
      />
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
