<script setup lang="ts">
import { Surface } from "@cela/design";

import type { Product } from "~/utils/site/films";
import type { ProductPage } from "~/utils/site/products";

const { slug, beats } = defineProps<{ slug: Product; beats: ProductPage["beats"] }>();
</script>

<template>
  <section class="beats wrap" :aria-labelledby="`${slug}-beats`">
    <div class="intro">
      <h2 :id="`${slug}-beats`" v-enter.words class="heading">{{ beats.heading }}</h2>
      <p v-enter class="line">{{ beats.line }}</p>
    </div>
    <div class="cards">
      <Surface v-for="beat in beats.items" :key="beat.glyph" v-enter.stagger as="article" class="card" data-glyph-host>
        <div class="card-head">
          <h3 class="name">{{ beat.title }}</h3>
          <SiteGlyph :name="beat.glyph" />
        </div>
        <p class="text"><SiteRuns :runs="beat.text" /></p>
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
}

.card {
  @apply flex flex-col gap-3;
}

.card-head {
  @apply flex items-start justify-between gap-4;
}

.name {
  @apply typo-heading-xl m-0 text-balance;
}

.text {
  @apply typo-body-md max-w-prose text-pretty text-muted;
}
</style>
