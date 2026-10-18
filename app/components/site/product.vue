<script setup lang="ts">
import type { Product } from "~/utils/site/films";
import { nextFlagship, products } from "~/utils/site/products";

const { slug } = defineProps<{ slug: Product }>();

const page = computed(() => products[slug]);
const next = computed(() => nextFlagship(slug));
const stage = useTemplateRef("stage");
</script>

<template>
  <article class="product">
    <header class="head wrap">
      <h1 v-enter.now.words.wide class="title">{{ page.name }}</h1>
      <p v-enter.now.wide="200" class="sub">{{ page.sub }}</p>
      <p v-enter.now.wide="320" class="lead"><SiteRuns :runs="page.lead" /></p>
    </header>

    <SiteProductStage ref="stage" :slug="slug" />
    <SiteProductBeats :slug="slug" :beats="page.beats" @show="stage?.show($event)" />
    <SiteProductDecides :slug="slug" :decides="page.decides" />
    <SiteProductNumbers :slug="slug" :numbers="page.numbers" />
    <SiteProductQuestions :slug="slug" :questions="page.questions" />

    <section class="built wrap" :aria-labelledby="`${slug}-built`">
      <h2 :id="`${slug}-built`" v-enter.words class="heading">Built with</h2>
      <p v-enter class="text">{{ page.builtWith }}</p>
      <ul class="stack">
        <li v-for="item in page.stack" :key="item" v-enter.stagger class="chip-look">{{ item }}</li>
      </ul>
    </section>

    <section class="next wrap" :aria-labelledby="`${slug}-next`">
      <h2 :id="`${slug}-next`" v-enter.words class="heading">Next</h2>
      <SiteFlagship v-enter class="next-card" v-bind="next" />
    </section>
  </article>
</template>

<style scoped>
.product {
  @apply flex flex-col gap-16 pt-8 sm:gap-24 sm:pt-16;
}

.head {
  @apply flex flex-col gap-4;
}

.title {
  @apply m-0 text-5xl font-bold tracking-tight text-balance sm:text-6xl;
}

.sub {
  @apply typo-heading-xl max-w-prose text-balance text-muted;
}

.lead {
  @apply typo-body-lg max-w-prose text-pretty text-muted;
}

.built,
.next {
  @apply flex flex-col gap-4;
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.text {
  @apply typo-body-lg max-w-prose text-pretty text-muted;
}

.stack {
  @apply m-0 flex list-none flex-wrap gap-2 p-0;
}

.next-card {
  @apply md:max-w-md;
}
</style>
