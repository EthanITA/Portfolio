<script setup lang="ts">
import { readSheet, SHEETS } from "~~/films/scripts/cues";
import { WINDOW, type FilmScript } from "~~/films/scripts/script";
import { Sky, STEPS, type Line, type Pose, type Size, type Widths } from "~~/films/utils/sky";

const { script } = defineProps<{ script: FilmScript }>();

type Mover = { element: HTMLElement; at: number; leave: number; swell: boolean };

const spoken = readSheet({ script, json: SHEETS[script.name] }).sheet.lines;
const { onFrame, defer, cut } = useFilmContext();

const ruler = useTemplateRef<HTMLElement>("ruler");
const sky = useTemplateRef<HTMLElement>("sky");
const lines = shallowRef<Line[]>([]);
const problems = shallowRef<string[]>([]);
const offsets = new Map<string, number[]>();
let movers: Mover[] = [];

const box = { left: `${WINDOW[cut].x}px`, width: `${WINDOW[cut].width}px`, bottom: `calc(100% - ${WINDOW[cut].y}px)` };

const glyphs = (word: HTMLElement): number[] => {
  const node = word.firstChild;
  if (!(node instanceof Text)) return [];
  const left = word.getBoundingClientRect().left;
  const range = document.createRange();
  let start = 0;
  return Sky.letters(word.textContent ?? "").map((letter) => {
    range.setStart(node, start);
    range.setEnd(node, start + letter.length);
    start += letter.length;
    return range.getBoundingClientRect().left - left;
  });
};

// Unicode-range subsets load per glyph, so each face is asked for with the text it has to set.
const fonts = (ruler: HTMLElement): Promise<unknown> => {
  const texts = new Map<string, string>();
  for (const word of ruler.querySelectorAll<HTMLElement>("[data-word], .film-sky-chip")) {
    const { fontWeight, fontSize, fontFamily } = getComputedStyle(word);
    const font = `${fontWeight} ${fontSize} ${fontFamily}`;
    texts.set(font, `${texts.get(font) ?? ""}${word.textContent ?? ""}`);
  }
  return Promise.all([...texts].map(([font, text]) => document.fonts.load(font, text)));
};

const read = (ruler: HTMLElement): Partial<Record<Size, Widths>>[] =>
  spoken.map((_, index) =>
    Object.fromEntries(
      STEPS[cut].flatMap((step) => {
        const line = ruler.querySelector<HTMLElement>(`[data-size="${step.size}"] [data-line="${index}"]`);
        if (!line) return [];
        const words = [...line.querySelectorAll<HTMLElement>("[data-word]")];
        words.forEach((word, position) => offsets.set(`${step.size}:${index}:${position}`, glyphs(word)));
        return [[step.size, { words: words.map((word) => word.getBoundingClientRect().width), space: line.querySelector("[data-space]")?.getBoundingClientRect().width ?? 0 }]];
      }),
    ),
  );

const build = async (): Promise<void> => {
  if (!ruler.value) return;
  await fonts(ruler.value);
  const planned = Sky.plan({ lines: spoken, measured: read(ruler.value), cut, fold: script.rig.until, violet: script.violet });
  lines.value = planned.lines;
  problems.value = planned.problems;
  await nextTick();
  movers = [...(sky.value?.querySelectorAll<HTMLElement>("[data-at]") ?? [])].map((element) => ({
    element,
    at: Number(element.dataset.at),
    leave: Number(element.dataset.leave),
    swell: "swell" in element.dataset,
  }));
};

const letterAt = ({ line, word, letter }: { line: number; word: number; letter: number }): string => {
  const size = lines.value[line]?.size;
  return `${offsets.get(`${size}:${line}:${word}`)?.[letter] ?? 0}px`;
};

const apply = (element: HTMLElement, { opacity, y, blur, scale }: Pose): void => {
  element.style.opacity = String(opacity);
  element.style.transform = y || scale !== 1 ? `translateY(${y}em) scale(${scale})` : "";
  element.style.filter = blur ? `blur(${blur}px)` : "none";
};

onMounted(() => defer(build()));

onFrame((ms) => {
  for (const { element, ...timing } of movers) apply(element, Sky.pose({ ms, ...timing }));
});
</script>

<template>
  <div v-if="!lines.length" ref="ruler" class="film-sky-ruler" aria-hidden="true">
    <div v-for="step in STEPS[cut]" :key="step.size" :data-size="step.size">
      <div v-for="(line, index) in spoken" :key="index" :data-line="index">
        <span class="film-sky-probe" data-space> </span>
        <template v-for="(word, position) in line.words" :key="position">
          <span v-if="Sky.code(word.text)" class="film-sky-probe" data-word><span class="film-sky-chip">{{ word.text }}</span></span>
          <span v-else class="film-sky-probe" data-word>{{ word.text }}</span>
        </template>
      </div>
    </div>
  </div>
  <div ref="sky" class="film-sky" :style="box" :data-problems="problems.join('\n')">
    <div v-for="(line, l) in lines" :key="l" class="film-sky-line" :data-size="line.size">
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
              data-swell
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
            :data-swell="word.swell || undefined"
          >
            <span v-if="word.code" class="film-sky-chip">{{ word.text }}</span>
            <template v-else>{{ word.text }}</template>
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.film-sky-ruler {
  @apply invisible absolute top-0 left-0 w-max leading-none font-bold tracking-tight whitespace-pre;
}
.film-sky-probe {
  @apply inline-block;
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
  @apply absolute inset-x-0 bottom-0 flex flex-col gap-2 pb-[0.25em] leading-none font-bold tracking-tight;
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
</style>
