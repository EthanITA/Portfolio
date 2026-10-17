<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

const { text, at, until } = defineProps<{ text: string; at: number; until: number }>();

const sentences = computed(() => [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)].map((part) => part.segment.trim()).filter(Boolean));

const caption = useTemplateRef<HTMLElement>("caption");
const { timeline, onFrame } = useFilmContext();

let fitted = false;

// A wrapped box keeps the band's full width, so a caption that breaks between sentences shrinks to its longest one.
onFrame(() => {
  if (fitted || !caption.value) return;
  fitted = true;
  const lines = [...caption.value.querySelectorAll<HTMLElement>(".film-sentence")];
  if (new Set(lines.map((line) => line.offsetTop)).size < 2) return;
  const style = getComputedStyle(caption.value);
  const edges = ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"] as const;
  const frame = edges.reduce((sum, edge) => sum + Number.parseFloat(style[edge]), 0);
  caption.value.style.width = `${Math.max(...lines.map((line) => line.getBoundingClientRect().width)) + frame}px`;
});

onMounted(() => {
  if (!caption.value) return;
  timeline
    .add(caption.value, { opacity: [0, 1], y: [12, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at)
    .add(caption.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});
</script>

<template>
  <div class="film-caption-band">
    <p ref="caption" class="film-caption">
      <template v-for="(sentence, index) in sentences" :key="index">
        <span class="film-sentence">{{ sentence }}</span>{{ index < sentences.length - 1 ? " " : "" }}
      </template>
    </p>
  </div>
</template>

<style scoped>
.film-caption-band {
  @apply pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-12;
}
.film-caption {
  @apply cela-glass max-w-full rounded-full px-8 py-4 text-center text-4xl font-bold tracking-tight opacity-0;
}
.film-sentence {
  @apply inline-block;
}
</style>
