<script setup lang="ts">
import type { StageTheme } from "~/utils/stage/theme";

type PosterName = "hero" | "lost" | "line" | "fence";

const { name, theme, eager = false, showWidth = false } = defineProps<{ name: PosterName; theme: StageTheme; eager?: boolean; showWidth?: boolean }>();

type Size = { width: number; height: number };
type Source = Size & { variant: string; below: number };

// Must match each poster's rendered size, or the img reserves the wrong box; the picture takes the first source that matches, so narrowest first.
const RENDERED: Record<PosterName, Size & { sources?: Source[] }> = {
  hero: { width: 1920, height: 1080, sources: [{ variant: "mobile", width: 1920, height: 1080, below: 1024 }] },
  lost: { width: 1920, height: 1080, sources: [{ variant: "mobile", width: 1920, height: 1080, below: 1024 }] },
  // The line's cards are fixed px and cover-cropped, so each lane count the fit lands on below desktop gets its own poster.
  line: {
    width: 1920,
    height: 1080,
    sources: [
      { variant: "mobile", width: 720, height: 828, below: 768 },
      { variant: "lanes-2", width: 1104, height: 1200, below: 816 },
      { variant: "lanes-3", width: 1158, height: 1116, below: 1016 },
    ],
  },
  fence: { width: 1920, height: 1080 },
};

const size = computed(() => RENDERED[name]);
</script>

<template>
  <div class="poster" aria-hidden="true">
    <picture :key="theme" class="picture">
      <source
        v-for="source in size.sources"
        :key="source.variant"
        :media="`(max-width: ${source.below - 1}px)`"
        :srcset="`/stage/${name}-${source.variant}-${theme}.webp`"
        :width="source.width"
        :height="source.height"
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
