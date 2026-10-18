<script setup lang="ts">
import { Surface } from "@cela/design";

import { REGIONS } from "~/utils/play/regions";
import type { Product } from "~/utils/site/films";
import type { ProductPage } from "~/utils/site/products";

type Still = { avif: string; webp: string; src: string; width: number; height: number };

// films/stills.ts renders each beat's region at 2x and 3x, and Sidecar's stills land with its re-render.
const SCALES = [2, 3];
const STILLED: Product[] = ["shell", "sage"];

const { slug, beats } = defineProps<{ slug: Product; beats: ProductPage["beats"] }>();
const emit = defineEmits<{ show: [id: string] }>();

const still = (id: string): Still | undefined => {
  const region = REGIONS[id];
  if (!region || !STILLED.includes(slug)) return;
  const set = (format: string): string =>
    SCALES.map((scale) => `/films/beats/${id}-${region.width * scale}.${format} ${region.width * scale}w`).join(", ");
  return { avif: set("avif"), webp: set("webp"), src: `/films/beats/${id}-${region.width * 2}.webp`, width: region.width * 2, height: region.height * 2 };
};

const cards = computed(() => beats.items.map((beat) => ({ ...beat, still: still(beat.glyph) })));

// Card widths from .wrap's max-w-5xl and px-5 sm:px-8 with the grid's gap-4.
const sizes = computed(() => {
  const columns = beats.items.length === 3 ? 3 : 2;
  const gaps = 16 * (columns - 1);
  return `(min-width: 1024px) ${(960 - gaps) / columns}px, (min-width: 768px) calc((100vw - ${64 + gaps}px) / ${columns}), (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)`;
});
</script>

<template>
  <section class="beats wrap" :aria-labelledby="`${slug}-beats`">
    <div class="intro">
      <h2 :id="`${slug}-beats`" v-enter.words class="heading">{{ beats.heading }}</h2>
      <p v-enter class="line">{{ beats.line }}</p>
    </div>
    <div class="cards" :data-count="beats.items.length">
      <Surface v-for="beat in cards" :key="beat.glyph" v-enter.stagger="{ after: `${slug}-beats` }" as="article" class="beat" pad="none" data-glyph-host>
        <picture v-if="beat.still" class="still">
          <source type="image/avif" :srcset="beat.still.avif" :sizes="sizes" />
          <source type="image/webp" :srcset="beat.still.webp" :sizes="sizes" />
          <img class="shot" :src="beat.still.src" :width="beat.still.width" :height="beat.still.height" alt="" loading="lazy" decoding="async" />
        </picture>
        <div class="body">
          <div class="beat-head">
            <h3 :id="`${slug}-beat-${beat.glyph}`" class="name">{{ beat.title }}</h3>
            <SiteGlyph v-if="!beat.still" :name="beat.glyph" />
          </div>
          <p class="text"><SiteRuns :runs="beat.text" /></p>
          <button type="button" class="show" :aria-describedby="`${slug}-beat-${beat.glyph}`" @click="emit('show', beat.glyph)">Show me</button>
        </div>
      </Surface>
    </div>
  </section>
</template>

<style scoped>
.beats {
  @apply flex flex-col gap-8;
}

.intro {
  @apply flex flex-col gap-3;
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.line {
  @apply typo-body-lg max-w-prose text-pretty text-muted;
}

.cards {
  @apply grid gap-4 md:grid-cols-2;

  &[data-count="3"] {
    @apply md:grid-cols-3;
  }
}

.beat {
  @apply flex flex-col overflow-hidden;
}

.still {
  @apply block aspect-16/10 bg-sunken;
}

.shot {
  @apply block size-full object-cover;
}

.body {
  @apply flex flex-1 flex-col gap-3 p-6;
}

.beat-head {
  @apply flex items-start justify-between gap-4;
}

.name {
  @apply typo-heading-xl m-0 text-balance;
}

.text {
  @apply typo-body-md max-w-prose text-pretty text-muted;
}

.show {
  @apply typo-body-strong mt-auto inline-flex min-h-11 w-fit cursor-pointer items-center border-0 bg-transparent p-0 text-primary underline-offset-4;

  &:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .show:hover {
    @apply underline;
  }
}
</style>
