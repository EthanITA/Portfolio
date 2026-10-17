<script setup lang="ts">
import { Surface } from "@cela/design";
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { type JSAnimation, animate, stagger, svg } from "animejs";

// Imported by hand: the auto-import binds this template-only component to useTemplateRef in the client build.
import PlaySageTick from "~/components/play/sage/tick.vue";
import { motionOn } from "~/utils/site/motion";

type Wait = { label: string; seconds: number; ends: "tick" | "silence" };

const KEYS = ["Pay", "Send", "Buy", "Order", "Delete", "Sign", "Push", "Publish", "Share"];
// The 5 s step goes through when nobody objects; the 20 s one only waits for a yes, so silence ends it empty.
const WAITS: Wait[] = [
  { label: "Changes something", seconds: 5, ends: "tick" },
  { label: "Others would see it", seconds: 20, ends: "silence" },
];
const DRAW_MS = 600;
const STAGGER_MS = 80;

const keys = useTemplateRef<HTMLElement>("keys");
const waits = useTemplateRef<HTMLElement>("waits");
const live = ref(false);
const ended = ref(WAITS.map(() => true));

let observer: IntersectionObserver | undefined;
let fills: HTMLElement[] = [];
const runs: (JSAnimation | undefined)[] = [];

const start = (at: number): void => {
  const fill = fills[at];
  const wait = WAITS[at];
  if (!fill || !wait) return;
  runs[at]?.cancel();
  ended.value[at] = false;
  fill.style.opacity = "1";
  runs[at] = animate(fill, {
    scaleX: [0, 1],
    duration: wait.seconds * 1000,
    ease: "linear",
    onComplete: () => {
      ended.value[at] = true;
      if (wait.ends === "tick") return;
      runs[at] = animate(fill, {
        opacity: [1, 0],
        duration: MOTION_DURATION.base,
        ease: MOTION_EASE.out,
        onComplete: () => (fill.style.transform = "scaleX(0)"),
      });
    },
  });
};

onMounted(async () => {
  if (!keys.value || !motionOn()) return;
  live.value = true;
  ended.value = WAITS.map(() => false);
  await nextTick();
  fills = [...(waits.value?.querySelectorAll<HTMLElement>("[data-fill]") ?? [])];
  for (const fill of fills) fill.style.transform = "scaleX(0)";
  const drawables = svg.createDrawable([...keys.value.querySelectorAll("rect")], 0, 0);
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
      <li v-for="key in KEYS" :key="key" class="key">
        {{ key }}
        <svg class="ring" aria-hidden="true"><rect width="100%" height="100%" rx="14" /></svg>
      </li>
    </ul>
    <div ref="waits" class="waits">
      <div v-for="(wait, at) in WAITS" :key="wait.label" class="wait">
        <button v-if="live" class="label press" type="button" @click="start(at)">{{ wait.label }}</button>
        <span v-else class="label">{{ wait.label }}</span>
        <span class="seconds">{{ wait.seconds }} s</span>
        <span class="end">
          <span class="track" aria-hidden="true"><span class="fill" data-fill :data-ends="wait.ends" /></span>
          <span class="status" :data-shown="ended[at]">
            <PlaySageTick v-if="wait.ends === 'tick'" class="tick" />
            <template v-else>Silence is no.</template>
          </span>
        </span>
      </div>
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
  @apply relative grid min-h-16 w-full grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-3 rounded-field p-3;

  &:has(.press:focus-visible) {
    @apply focus-ring;
  }
}

.label {
  @apply typo-body-strong text-left text-fg;
}

.press {
  @apply cursor-pointer border-0 bg-transparent p-0 outline-none after:absolute after:inset-0 after:rounded-field after:content-[''];
}

.seconds {
  @apply font-mono typo-body text-muted tabular-nums;
}

.end {
  @apply col-span-2 flex min-h-6 items-center gap-3;
}

.track {
  @apply relative h-1.5 flex-1 overflow-hidden rounded-full border border-primary/40;
}

.fill {
  @apply absolute inset-0 origin-left rounded-full bg-primary;

  &[data-ends="silence"] {
    transform: scaleX(0);
  }
}

.status {
  @apply typo-body-md flex-none text-muted transition-opacity duration-(--duration-base) ease-out;

  &[data-shown="false"] {
    @apply opacity-0;
  }
}

.tick {
  @apply block size-5 fill-none stroke-primary;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (hover: hover) and (pointer: fine) {
  .wait:has(.press:hover) {
    @apply bg-sunken;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status {
    @apply transition-none;
  }
}
</style>
