<script setup lang="ts">
import { Surface } from "@cela/design";

import { type Product, films } from "~/utils/site/films";
import type { Beat, Run } from "~/utils/site/text";

const { slug, name, sub, lead, beats, builtWith, status, limit } = defineProps<{
  slug: Product;
  name: string;
  sub: string;
  lead: Run[];
  beats: Beat[];
  builtWith: string;
  status: string;
  limit?: string;
}>();

const film = films[slug];
const playing = ref(false);
</script>

<template>
  <article class="product">
    <header class="head wrap">
      <h1 v-enter.now.words.wide class="title">{{ name }}</h1>
      <p v-enter.now="200" class="sub">{{ sub }}</p>
      <p v-enter.now="320" class="lead"><SiteRuns :runs="lead" /></p>
    </header>

    <div v-enter.now="420" class="film wrap">
      <Surface class="frame" variant="raised" shape="island" pad="none">
        <video v-if="playing && film" class="video" controls autoplay playsinline preload="none" :poster="film.poster">
          <source :src="film.webm" type="video/webm" />
          <source :src="film.mp4" type="video/mp4" />
        </video>
        <template v-else>
          <img v-if="film" class="poster" :src="film.poster" alt="" width="1920" height="1080" decoding="async" />
          <button v-press class="watch" type="button" :disabled="!film" @click="playing = true">
            <svg class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
            Watch the film
          </button>
        </template>
      </Surface>
    </div>

    <div class="stage wrap">
      <SiteMount name="play">
        <slot />
      </SiteMount>
    </div>

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
      <p v-enter class="status"><span class="status-dot" aria-hidden="true" />{{ status }}</p>
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

.frame {
  @apply relative grid aspect-video w-full place-items-center overflow-hidden;
}

.poster,
.video {
  @apply absolute inset-0 size-full object-cover;
}

.watch {
  @apply surface-glass relative z-10 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 px-5 typo-body-strong text-fg;

  &:disabled {
    @apply cursor-default text-muted;
  }

  &:focus-visible {
    @apply focus-ring;
  }
}

.play {
  @apply size-4 fill-current;
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

.status {
  @apply chip-look w-fit text-fg;
}
</style>
