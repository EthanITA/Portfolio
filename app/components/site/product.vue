<script setup lang="ts">
import { Surface } from "@cela/design";

import type { Product } from "~/utils/site/films";
import type { Beat, Run } from "~/utils/site/text";

const { slug, name, sub, lead, beats, builtWith, limit } = defineProps<{
  slug: Product;
  name: string;
  sub: string;
  lead: Run[];
  beats: Beat[];
  builtWith: string;
  limit?: string;
}>();
</script>

<template>
  <article class="product">
    <header class="head wrap">
      <h1 v-enter.now.words.wide class="title">{{ name }}</h1>
      <p v-enter.now.wide="200" class="sub">{{ sub }}</p>
      <p v-enter.now.wide="320" class="lead"><SiteRuns :runs="lead" /></p>
    </header>

    <SiteProductStage :slug="slug" />

    <div class="beats wrap">
      <Surface v-for="beat in beats" :key="beat.title" v-enter.stagger as="section" class="beat" data-glyph-host>
        <div class="beat-head">
          <h2 class="name">{{ beat.title }}</h2>
          <SiteGlyph :name="beat.glyph" />
        </div>
        <p class="text"><SiteRuns :runs="beat.text" /></p>
      </Surface>
    </div>

    <div class="facts wrap">
      <p v-if="limit" v-enter class="limit">{{ limit }}</p>
      <Surface v-enter class="built" variant="sunken">
        <h2 class="name">Built with</h2>
        <p class="text">{{ builtWith }}</p>
      </Surface>
    </div>
  </article>
</template>

<style scoped>
.product {
  @apply flex flex-col gap-16 pt-8 sm:pt-16;
}

.head {
  @apply flex flex-col gap-4;
}

.title {
  @apply m-0 text-5xl font-bold tracking-tight sm:text-7xl;
}

.sub {
  @apply typo-heading-xl text-muted;
}

.lead {
  @apply typo-body-lg max-w-2xl text-muted;
}

.beats {
  @apply grid gap-4 md:grid-cols-2;
}

.beat {
  @apply flex flex-col gap-3;
}

.beat-head {
  @apply flex items-start justify-between gap-4;
}

.built {
  @apply flex flex-col gap-2;
}

.name {
  @apply typo-heading-lg m-0;
}

.text {
  @apply typo-body-md text-muted;
}

.facts {
  @apply flex flex-col gap-6;
}

.limit {
  @apply typo-caption text-muted;
}
</style>
