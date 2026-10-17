<script setup lang="ts">
import { Segmented, Surface } from "@cela/design";

import { type Cut, type Product, films } from "~/utils/site/films";

type Mode = "try" | "watch";

const MODES: { label: string; value: Mode }[] = [
  { label: "Try it", value: "try" },
  { label: "Watch the film", value: "watch" },
];

const { slug } = defineProps<{ slug: Product }>();

const film = films[slug];
const route = useRoute();
const mode = ref<Mode>("try");
const loaded = ref(false);
const wide = ref(true);
const portraitMissing = ref(false);
const video = useTemplateRef<HTMLVideoElement>("video");
const playground = useTemplateRef("playground");

// The landscape cut follows the portrait one, so a portrait file that 404s falls through to the letterboxed master.
const cuts = computed<Cut[]>(() => {
  if (!film) return [];
  return wide.value || !film.portrait || portraitMissing.value ? [film.landscape] : [film.portrait, film.landscape];
});
const poster = computed(() => cuts.value[0]?.poster);

const onPosterError = (): void => {
  if (cuts.value.length > 1) portraitMissing.value = true;
};

const SM = "(min-width: 640px)";
let query: MediaQueryList | undefined;

// Both cuts share one timeline, so a paused player swaps orientation in place and keeps its position.
const onQuery = async (event: MediaQueryListEvent): Promise<void> => {
  const player = video.value;
  if (player && !player.paused) return;
  wide.value = event.matches;
  if (!player) return;
  const at = player.currentTime;
  await nextTick();
  player.load();
  player.currentTime = at;
};

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

// Watch always offers Take over, since Play the demo there would restart a toy the film is hiding.
const control = computed(() => {
  const toy = playground.value;
  if (!toy || mode.value === "try") return toy ?? undefined;
  return {
    driver: "demo" as const,
    demo: toy.demo,
    take: (): void => {
      choose("try");
      void nextTick(toy.take);
    },
  };
});

// The pressed pill unmounts, so focus moves to the player to keep its controls on the keyboard.
const startFilm = async (): Promise<void> => {
  await play();
  video.value?.focus();
};

onMounted(() => {
  query = matchMedia(SM);
  wide.value = query.matches;
  query.addEventListener("change", onQuery);
  if (film && route.hash === "#film") mode.value = "watch";
});

onBeforeUnmount(() => query?.removeEventListener("change", onQuery));
</script>

<template>
  <div id="film" v-enter.now.wide="420" class="stage wrap">
    <div class="bar">
      <Segmented v-if="film" :model-value="mode" :options="MODES" @update:model-value="choose" />
      <PlayChip class="chip" :play="control" />
    </div>
    <SiteMount name="play">
      <div v-show="mode === 'try'" class="layer">
        <LazyPlaySidecar v-if="slug === 'sidecar'" ref="playground" :paused="mode === 'watch'" />
        <LazyPlaySage v-else-if="slug === 'sage'" ref="playground" :paused="mode === 'watch'" />
        <LazyPlayShell v-else ref="playground" :paused="mode === 'watch'" />
      </div>
      <Surface v-if="film" v-show="mode === 'watch'" class="film" variant="sunken" shape="island" pad="none">
        <video v-if="loaded" ref="video" class="video" controls playsinline preload="none" :poster="poster" @ended="choose('try')">
          <template v-for="source in cuts" :key="source.webm">
            <source :src="source.webm" type='video/webm; codecs="vp9, opus"' />
            <source :src="source.mp4" type='video/mp4; codecs="avc1.64002A, mp4a.40.2"' />
          </template>
        </video>
        <template v-else>
          <img class="poster" :src="poster" alt="" loading="lazy" decoding="async" @error="onPosterError" />
          <button v-press class="watch" type="button" @click="startFilm">
            <svg class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
            Watch the film
          </button>
        </template>
      </Surface>
    </SiteMount>
  </div>
</template>

<style scoped>
.stage {
  @apply flex scroll-mt-20 flex-col gap-4;
}

.bar {
  @apply sticky top-20 z-10 flex items-center justify-between gap-3 md:static;
}

.chip {
  @apply ml-auto;
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
</style>
