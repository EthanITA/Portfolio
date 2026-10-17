<script setup lang="ts">
import { Surface } from "@cela/design";
import { MOTION_EASE } from "@cela/design/utils/motion";
import { type JSAnimation, animate, stagger, svg } from "animejs";

import { motionOn } from "~/utils/site/motion";

const KEYS = ["Pay", "Send", "Buy", "Order", "Delete", "Sign", "Push", "Publish", "Share"];
const WAITS = [
  { label: "Changes something", seconds: 5 },
  { label: "Others would see it", seconds: 20 },
];
const DRAW_MS = 600;
const STAGGER_MS = 80;

const keys = useTemplateRef<HTMLElement>("keys");
const waits = useTemplateRef<HTMLElement>("waits");
const live = ref(false);

let observer: IntersectionObserver | undefined;
let drawables: ReturnType<typeof svg.createDrawable> = [];
let fills: HTMLElement[] = [];
const runs: (JSAnimation | undefined)[] = [];

const fine = (): boolean => matchMedia("(hover: hover) and (pointer: fine)").matches;

const onKey = (at: number): void => {
  const drawable = drawables[at];
  if (!drawable || !fine()) return;
  animate(drawable, { draw: ["0 0", "0 1"], duration: DRAW_MS, ease: MOTION_EASE.out });
};

const wait = (at: number): void => {
  const fill = fills[at];
  const seconds = WAITS[at]?.seconds;
  if (!fill || !seconds) return;
  runs[at]?.cancel();
  runs[at] = animate(fill, { scaleX: [0, 1], duration: seconds * 1000, ease: "linear" });
};

onMounted(async () => {
  if (!keys.value || !motionOn()) return;
  live.value = true;
  await nextTick();
  fills = [...(waits.value?.querySelectorAll<HTMLElement>("[data-fill]") ?? [])];
  for (const fill of fills) fill.style.transform = "scaleX(0)";
  drawables = svg.createDrawable([...keys.value.querySelectorAll("rect")], 0, 0);
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      animate(drawables, { draw: ["0 0", "0 1"], duration: DRAW_MS, delay: stagger(STAGGER_MS), ease: MOTION_EASE.out });
    },
    { threshold: 0.6 },
  );
  observer.observe(keys.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  for (const run of runs) run?.cancel();
});
</script>

<template>
  <Surface class="sage">
    <ul ref="keys" class="keys">
      <li v-for="(key, at) in KEYS" :key="key" class="key" @pointerenter="onKey(at)">
        {{ key }}
        <svg class="ring" aria-hidden="true"><rect width="100%" height="100%" rx="14" /></svg>
      </li>
    </ul>
    <div ref="waits" class="waits">
      <component :is="live ? 'button' : 'div'" v-for="(item, at) in WAITS" :key="item.label" class="wait" :type="live ? 'button' : undefined" @click="wait(at)">
        <span class="label">{{ item.label }}</span>
        <span class="seconds">{{ item.seconds }} s</span>
        <span class="track" aria-hidden="true"><span class="fill" data-fill /></span>
      </component>
    </div>
  </Surface>
</template>

<style scoped>
.sage {
  @apply grid gap-8 md:grid-cols-[3fr_2fr] md:items-center md:gap-10;
}

.keys {
  @apply m-0 grid list-none grid-cols-3 gap-4 p-1.5;
}

.key {
  @apply typo-body-strong relative flex h-12 items-center justify-center rounded-lg border border-border bg-raised text-fg shadow-xs;
}

.ring {
  @apply pointer-events-none absolute -inset-1.5 size-[calc(100%+0.75rem)] overflow-visible fill-none stroke-primary stroke-2;
}

.waits {
  @apply flex flex-col gap-3;
}

.wait {
  @apply grid min-h-16 w-full grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-3 rounded-field border-0 bg-transparent p-3 text-left;
}

button.wait {
  @apply cursor-pointer;

  &:focus-visible {
    @apply focus-ring;
  }
}

.label {
  @apply typo-body-strong text-fg;
}

.seconds {
  @apply font-mono typo-body text-muted tabular-nums;
}

.track {
  @apply relative col-span-2 h-1 overflow-hidden rounded-full bg-primary/20;
}

.fill {
  @apply absolute inset-0 origin-left rounded-full bg-primary;
}

@media (hover: hover) and (pointer: fine) {
  button.wait:hover {
    @apply bg-sunken;
  }
}
</style>
