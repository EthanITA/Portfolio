<script setup lang="ts">
import type { Beat, Run } from "~/utils/site/text";

const { name, sub, lead, beats, builtWith, status, limit } = defineProps<{
  name: string;
  sub: string;
  lead: Run[];
  beats: Beat[];
  builtWith: string;
  status: string;
  limit?: string;
}>();
</script>

<template>
  <article class="product">
    <header class="head wrap">
      <h1 class="title">{{ name }}</h1>
      <p class="sub">{{ sub }}</p>
      <p class="lead"><SiteRuns :runs="lead" /></p>
    </header>

    <figure class="film wrap">
      <div class="frame" />
      <figcaption class="label">Watch the film</figcaption>
    </figure>

    <div class="play wrap">
      <SiteMount name="play">
        <slot />
      </SiteMount>
    </div>

    <div class="beats wrap">
      <section v-for="beat in beats" :key="beat.title" class="beat">
        <h2 class="name">{{ beat.title }}</h2>
        <p class="text"><SiteRuns :runs="beat.text" /></p>
      </section>
    </div>

    <section class="facts wrap">
      <div class="fact">
        <h2 class="name">Built with</h2>
        <p class="text">{{ builtWith }}</p>
      </div>
      <p v-if="limit" class="limit">{{ limit }}</p>
      <p class="status">{{ status }}</p>
    </section>
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

.film {
  @apply m-0 flex flex-col gap-3;
}

.frame {
  @apply aspect-video w-full rounded-box bg-sunken;
}

.label {
  @apply typo-caption-medium text-muted;
}

.beats {
  @apply grid gap-8 sm:grid-cols-2;
}

.beat,
.fact {
  @apply flex flex-col gap-2;
}

.name {
  @apply typo-heading-lg m-0;
}

.text {
  @apply typo-body-md max-w-xl text-muted;
}

.facts {
  @apply flex flex-col gap-6;
}

.limit {
  @apply typo-body-strong text-fg;
}

.status {
  @apply typo-caption-medium w-fit rounded-full bg-primary-soft px-2.5 py-1 text-primary;
}
</style>
