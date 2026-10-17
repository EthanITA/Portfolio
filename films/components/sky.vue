<script setup lang="ts">
import { Kbd } from "@cela/design";
import { readSheet, SHEETS } from "~~/films/scripts/cues";
import { WINDOW, type FilmScript } from "~~/films/scripts/script";
import { Glyphs, type Mover } from "~~/films/utils/glyphs";
import { Sky, SKY, STEPS, type Box, type Cap, type Line, type Metrics, type Size, type Widths } from "~~/films/utils/sky";

const { script } = defineProps<{ script: FilmScript }>();

const spoken = readSheet({ script, json: SHEETS[script.name] }).sheet.lines;
const keys = [...new Set([...script.keys, ...script.waits].map((press) => press.key))];
const { onFrame, defer, cut } = useFilmContext();

const ruler = useTemplateRef<HTMLElement>("ruler");
const sky = useTemplateRef<HTMLElement>("sky");
const lines = shallowRef<Line[]>([]);
const caps = shallowRef<Cap[]>([]);
const problems = shallowRef<string[]>([]);
const offsets = new Map<string, number[]>();
let movers: Mover[] = [];
let pressed: { element: HTMLElement; cap: Cap }[] = [];

const box = { left: `${WINDOW[cut].x}px`, width: `${WINDOW[cut].width}px`, bottom: `calc(100% - ${WINDOW[cut].y}px)` };
const spacing = { gap: `${SKY.gap}px`, paddingBottom: `${SKY.pad}em` };

const read = (ruler: HTMLElement): Partial<Record<Size, Widths>>[] =>
  spoken.map((_, index) =>
    Object.fromEntries(
      STEPS[cut].flatMap((step) => {
        const line = ruler.querySelector<HTMLElement>(`[data-size="${step.size}"] [data-line="${index}"]`);
        if (!line) return [];
        const words = [...line.querySelectorAll<HTMLElement>("[data-word]")];
        words.forEach((word, position) => offsets.set(`${step.size}:${index}:${position}`, Glyphs.offsets(word)));
        return [[step.size, { words: words.map((word) => word.getBoundingClientRect().width), space: line.querySelector("[data-space]")?.getBoundingClientRect().width ?? 0 }]];
      }),
    ),
  );

const metrics = (ruler: HTMLElement): Partial<Record<Size, Metrics>> =>
  Object.fromEntries(
    STEPS[cut].flatMap((step) => {
      const line = ruler.querySelector<HTMLElement>(`[data-size="${step.size}"] [data-metrics]`);
      const baseline = line?.querySelector("[data-baseline]");
      if (!line || !baseline) return [];
      return [[step.size, { em: Number.parseFloat(getComputedStyle(line).fontSize), descent: line.getBoundingClientRect().bottom - baseline.getBoundingClientRect().bottom }]];
    }),
  );

const boxes = (ruler: HTMLElement): Partial<Record<string, Box>> =>
  Object.fromEntries(
    [...ruler.querySelectorAll<HTMLElement>("[data-keys]")].map((element) => {
      const { width, height } = element.getBoundingClientRect();
      return [element.dataset.keys, { width, height }];
    }),
  );

const build = async (): Promise<void> => {
  if (!ruler.value) return;
  await Glyphs.load(ruler.value, "[data-word], .film-sky-chip, .film-sky-cap kbd");
  const planned = Sky.plan({ lines: spoken, measured: read(ruler.value), cut, fold: script.rig.until, end: script.duration, violet: script.violet });
  const placed = Sky.caps({ keys: script.keys, waits: script.waits, lines: planned.lines, metrics: metrics(ruler.value), boxes: boxes(ruler.value), cut });
  lines.value = planned.lines;
  caps.value = placed.caps;
  problems.value = [...planned.problems, ...placed.problems];
  await nextTick();
  if (!sky.value) return;
  movers = Glyphs.movers(sky.value);
  pressed = [...sky.value.querySelectorAll<HTMLElement>("[data-cap]")].flatMap((element) => {
    const cap = caps.value[Number(element.dataset.cap)];
    return cap ? [{ element, cap }] : [];
  });
};

const letterAt = ({ line, word, letter }: { line: number; word: number; letter: number }): string => {
  const size = lines.value[line]?.size;
  return `${offsets.get(`${size}:${line}:${word}`)?.[letter] ?? 0}px`;
};

onMounted(() => defer(build()));

onFrame((ms) => {
  for (const { element, ...timing } of movers) Glyphs.apply(element, Sky.pose({ ms, ...timing }));
  for (const { element, cap } of pressed) {
    const { down, ...pose } = Sky.press({ ms, cap });
    Glyphs.apply(element, pose);
    element.style.setProperty("--down", String(down));
  }
});
</script>

<template>
  <div v-if="!lines.length" ref="ruler" class="film-sky-ruler" :data-cut="cut" aria-hidden="true">
    <div v-for="step in STEPS[cut]" :key="step.size" :data-size="step.size">
      <div data-metrics>x<span class="film-sky-baseline" data-baseline /></div>
      <div v-for="(line, index) in spoken" :key="index" :data-line="index">
        <span class="film-sky-probe" data-space> </span>
        <template v-for="(word, position) in line.words" :key="position">
          <span v-if="Sky.code(word.text)" class="film-sky-probe" data-word><span class="film-sky-chip">{{ word.text }}</span></span>
          <span v-else class="film-sky-probe" data-word>{{ word.text }}</span>
        </template>
      </div>
    </div>
    <span v-for="key in keys" :key="key" class="film-sky-cap" :data-keys="key"><Kbd :keys="key" /></span>
  </div>
  <div ref="sky" class="film-sky" :style="box" :data-cut="cut" :data-problems="problems.join('\n')">
    <div v-for="(line, l) in lines" :key="l" class="film-sky-line" :style="spacing" :data-size="line.size">
      <div v-for="(row, r) in line.rows" :key="r" class="film-sky-row">
        <template v-for="word in row.words" :key="word.index">
          <span v-if="word.letters" class="film-sky-word" :data-tone="word.tone" :style="{ left: `${word.x}px`, width: `${word.width}px` }">
            <span
              v-for="(letter, n) in word.letters"
              :key="n"
              class="film-sky-letter"
              :style="{ left: letterAt({ line: l, word: word.index, letter: n }) }"
              :data-at="letter.at"
              :data-leave="word.leave"
              data-swell="true"
              >{{ letter.text }}</span
            >
          </span>
          <span
            v-else
            class="film-sky-word"
            :data-tone="word.tone"
            :style="{ left: `${word.x}px`, width: `${word.width}px` }"
            :data-at="word.at"
            :data-leave="word.leave"
            :data-swell="word.swell"
          >
            <span v-if="word.code" class="film-sky-chip">{{ word.text }}</span>
            <template v-else>{{ word.text }}</template>
          </span>
        </template>
      </div>
    </div>
    <span v-for="(cap, index) in caps" :key="cap.at" class="film-sky-cap" :style="{ bottom: `${cap.bottom}px` }" :data-cap="index"><Kbd :keys="cap.keys" /></span>
  </div>
</template>

<style scoped>
.film-sky-ruler {
  @apply invisible absolute top-0 left-0 w-max leading-none font-bold tracking-tight whitespace-pre;
}
.film-sky-probe {
  @apply inline-block;
}
.film-sky-baseline {
  @apply inline-block h-0 w-0;
}
[data-size="8xl"] {
  @apply text-8xl;
}
[data-size="7xl"] {
  @apply text-7xl;
}
[data-size="6xl"] {
  @apply text-6xl;
}
[data-size="5xl"] {
  @apply text-5xl;
}
.film-sky {
  @apply pointer-events-none absolute;
}
.film-sky-line {
  @apply absolute inset-x-0 bottom-0 flex flex-col leading-none font-bold tracking-tight;
}
.film-sky-row {
  @apply relative h-[1em];
}
.film-sky-word {
  @apply absolute top-0 h-[1em] whitespace-pre;
}
.film-sky-letter {
  @apply absolute top-0;
}
.film-sky [data-at] {
  @apply origin-bottom opacity-0;
}
.film-sky-chip {
  @apply kbd-cap h-[1.4em] min-w-[1.4em] rounded-[0.35em] px-[0.3em] align-top text-[0.7em];
  color: inherit;
}
.film-sky-word[data-tone="ink"] {
  @apply text-fg;
}
.film-sky-word[data-tone="violet"] {
  @apply text-primary;
}
.film-sky-word[data-tone="muted"] {
  @apply text-muted;
}
/* The pose rises 0.4em, so the cap's em is the zoomed 18 px keycap's height. */
.film-sky-cap {
  @apply inline-flex text-[54px];
}
.film-sky-cap :deep(.kbd) {
  zoom: 3;
}
[data-cut="tall"] .film-sky-cap {
  @apply text-[45px];
}
[data-cut="tall"] .film-sky-cap :deep(.kbd) {
  zoom: 2.5;
}
/* A press sinks each cap by its 1 px depth line, which the zoom scales with the cap. */
.film-sky-cap :deep(kbd) {
  translate: 0 calc(var(--down, 0) * 1px);
  box-shadow: 0 calc((1 - var(--down, 0)) * 1px) 0 var(--border-strong);
}
.film-sky > .film-sky-cap {
  @apply absolute right-0 origin-bottom opacity-0;
}
</style>
