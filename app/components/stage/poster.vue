<script setup lang="ts">
import type { StageTheme } from "~/utils/stage/theme";

type PosterName = "hero" | "lost" | "line" | "fence";

const { name, theme, eager = false, showWidth = false } = defineProps<{ name: PosterName; theme: StageTheme; eager?: boolean; showWidth?: boolean }>();

type Size = { width: number; height: number };

// Must match each poster's rendered size, or the img reserves the wrong box; below is that scene's own phone breakpoint.
const RENDERED: Record<PosterName, Size & { mobile?: Size & { below: number } }> = {
  hero: { width: 1920, height: 1080, mobile: { width: 1920, height: 1080, below: 1024 } },
  lost: { width: 1920, height: 1080, mobile: { width: 1920, height: 1080, below: 1024 } },
  line: { width: 1920, height: 1080, mobile: { width: 800, height: 1000, below: 768 } },
  fence: { width: 1920, height: 1080 },
};

const size = computed(() => RENDERED[name]);
</script>

<template>
  <div class="poster" aria-hidden="true">
    <picture :key="theme" class="picture">
      <source
        v-if="size.mobile"
        :media="`(max-width: ${size.mobile.below - 1}px)`"
        :srcset="`/stage/${name}-mobile-${theme}.webp`"
        :width="size.mobile.width"
        :height="size.mobile.height"
      />
      <img
        class="image"
        :class="{ whole: showWidth }"
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

/* Matches the live canvas, which shows the whole frame width under 16:9 from lg up; the phone poster keeps its cover crop. */
@media (min-width: 1024px) and (max-aspect-ratio: 16/9) {
  .whole {
    @apply object-contain;
  }
}
</style>
