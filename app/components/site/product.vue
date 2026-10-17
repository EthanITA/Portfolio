<script setup lang="ts">
import { Segmented, Surface } from "@cela/design";

import { type Product, films } from "~/utils/site/films";
import type { Beat, Run } from "~/utils/site/text";

type Mode = "try" | "watch";

const MODES: { label: string; value: Mode }[] = [
  { label: "Try it", value: "try" },
  { label: "Watch the film", value: "watch" },
];

const { slug, name, sub, lead, beats, builtWith, limit } = defineProps<{
  slug: Product;
  name: string;
  sub: string;
  lead: Run[];
  beats: Beat[];
  builtWith: string;
  limit?: string;
}>();

const film = films[slug];
const route = useRoute();
const mode = ref<Mode>("try");
const loaded = ref(false);
const video = useTemplateRef<HTMLVideoElement>("video");

const play = async (): Promise<void> => {
  loaded.value = true;
  await nextTick();
  // Switching back before playback starts interrupts play(), and the pause is what the visitor asked for.
  await video.value?.play().catch(() => undefined);
};

const choose = (next: Mode): void => {
  mode.value = next;
  history.replaceState(history.state, "", next === "watch" ? "#film" : `${location.pathname}${location.search}`);
  if (next === "watch") void play();
  else video.value?.pause();
};

// The pressed pill unmounts, so focus moves to the player to keep its controls on the keyboard.
const startFilm = async (): Promise<void> => {
  await play();
  video.value?.focus();
};

onMounted(() => {
  if (film && route.hash === "#film") mode.value = "watch";
});
</script>

<template>
  <article class="product">
    <header class="head wrap">
      <h1 v-enter.now.words.wide class="title">{{ name }}</h1>
      <p v-enter.now.wide="200" class="sub">{{ sub }}</p>
      <p v-enter.now.wide="320" class="lead"><SiteRuns :runs="lead" /></p>
    </header>

    <div id="film" v-enter.now.wide="420" class="stage wrap">
      <div v-if="film" class="bar">
        <Segmented :model-value="mode" :options="MODES" @update:model-value="choose" />
      </div>
      <SiteMount name="play">
        <div v-show="mode === 'try'" class="layer">
          <slot />
        </div>
        <Surface v-if="film" v-show="mode === 'watch'" class="film" variant="sunken" shape="island" pad="none">
          <video v-if="loaded" ref="video" class="video" controls playsinline preload="none" :poster="film.poster" @ended="choose('try')">
            <source :src="film.webm" type='video/webm; codecs="vp9, opus"' />
            <source :src="film.mp4" type='video/mp4; codecs="avc1.64002A, mp4a.40.2"' />
          </video>
          <template v-else>
            <img class="poster" :src="film.poster" alt="" width="1920" height="1080" loading="lazy" decoding="async" />
            <button v-press class="watch" type="button" @click="startFilm">
              <svg class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
              Watch the film
            </button>
          </template>
        </Surface>
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

.stage {
  @apply flex scroll-mt-20 flex-col gap-4;
}

.bar {
  @apply sticky top-20 z-10 flex items-center justify-between gap-3 md:static;
}

.film {
  @apply grid place-items-center overflow-hidden;
}

.poster,
.video {
  @apply absolute inset-0 size-full object-contain;
}

.video:focus-visible {
  @apply focus-ring;
}

.watch {
  @apply surface-raised relative z-10 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 px-5 typo-body-strong text-fg;

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
</style>
