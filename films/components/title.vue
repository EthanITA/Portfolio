<script setup lang="ts">
import { GRID } from "~~/films/scripts/script";
import { Glyphs, type Mover } from "~~/films/utils/glyphs";
import { Sky, SKY } from "~~/films/utils/sky";

const { text, at, until, tone = "default" } = defineProps<{ text: string; at: number; until: number; tone?: "default" | "inverse" }>();

const title = useTemplateRef<HTMLElement>("title");
const { onFrame, defer, cut } = useFilmContext();

const words = text.split(" ").map((word, index) => ({ text: word, at: at + index * GRID.beatMs, letters: Sky.letters(word) }));
const leave = until - SKY.exit - SKY.trail * (words.length - 1);
const offsets = shallowRef<number[][]>([]);
let movers: Mover[] = [];

onMounted(() =>
  defer(
    (async () => {
      if (!title.value) return;
      await Glyphs.load(title.value, "[data-text]");
      offsets.value = [...title.value.querySelectorAll<HTMLElement>("[data-text]")].map(Glyphs.offsets);
      await nextTick();
      movers = Glyphs.movers(title.value);
    })(),
  ),
);

onFrame((ms) => {
  for (const { element, ...timing } of movers) Glyphs.apply(element, Sky.pose({ ms, ...timing }));
});
</script>

<template>
  <h1 ref="title" class="film-title" :data-tone="tone" :data-cut="cut">
    <template v-for="(word, w) in words" :key="w">
      <span class="film-title-word">
        <span class="film-title-text" data-text>{{ word.text }}</span>
        <span
          v-for="(letter, n) in word.letters"
          :key="n"
          class="film-title-letter"
          :style="{ left: `${offsets[w]?.[n] ?? 0}px` }"
          :data-at="word.at + n * SKY.ripple"
          :data-leave="leave + w * SKY.trail"
          data-swell
          >{{ letter }}</span
        >
      </span>
      {{ w < words.length - 1 ? " " : "" }}
    </template>
  </h1>
</template>

<style scoped>
.film-title {
  @apply absolute top-1/2 left-0 w-full -translate-y-1/2 text-center text-8xl leading-none font-bold tracking-tight;
}
.film-title[data-cut="tall"] {
  @apply text-7xl;
}
.film-title[data-tone="inverse"] {
  @apply text-raised;
}
.film-title-word {
  @apply relative inline-block;
}
.film-title-text {
  @apply invisible;
}
.film-title-letter {
  @apply absolute top-0 origin-bottom opacity-0;
}
</style>
