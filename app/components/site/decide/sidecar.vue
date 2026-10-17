<script setup lang="ts">
import { Surface } from "@cela/design";
import { MOTION_EASE } from "@cela/design/utils/motion";
import { type JSAnimation, animate } from "animejs";

import { type DiffLine, EDITS } from "~/utils/play/sidecar";
import { motionOn } from "~/utils/site/motion";

type Row = { mark: DiffLine["mark"] | "blank"; line?: number; text: string };
type Pair = { before: Row; after: Row };

const SIGN: Record<Row["mark"], string> = { add: "+", remove: "−", same: " ", blank: " " };
const BLANK: Row = { mark: "blank", text: "" };
const REST = 50;
const WIPE_MS = 1200;
const KEY_STEP = 5;

const { labelledby } = defineProps<{ labelledby: string }>();

// Removed and added runs pair up row by row, so both sides keep the same height and the wipe lines up.
const pairs = (lines: DiffLine[]): Pair[] => {
  const out: Pair[] = [];
  let removed: DiffLine[] = [];
  let added: DiffLine[] = [];
  const flush = (): void => {
    for (let at = 0; at < Math.max(removed.length, added.length); at++) out.push({ before: removed[at] ?? BLANK, after: added[at] ?? BLANK });
    removed = [];
    added = [];
  };
  for (const line of lines) {
    if (line.mark === "same") {
      flush();
      out.push({ before: line, after: line });
    } else (line.mark === "remove" ? removed : added).push(line);
  }
  flush();
  return out;
};

const { path, hunks } = EDITS.index;
const HUNKS = hunks.map((hunk) => ({ id: hunk.id, pairs: pairs(hunk.lines) }));

const compare = useTemplateRef<HTMLElement>("compare");
const split = ref(REST);

let observer: IntersectionObserver | undefined;
let wipe: JSAnimation | undefined;
let dragging = false;

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

const at = (x: number): number => {
  const box = compare.value?.getBoundingClientRect();
  return box?.width ? clamp(((x - box.left) / box.width) * 100) : split.value;
};

const onDown = (event: PointerEvent): void => {
  wipe?.cancel();
  dragging = true;
  compare.value?.setPointerCapture(event.pointerId);
  split.value = at(event.clientX);
};

const onMove = (event: PointerEvent): void => {
  if (dragging) split.value = at(event.clientX);
};

const onUp = (): void => {
  dragging = false;
};

const KEYS: Record<string, (value: number) => number> = {
  ArrowLeft: (value) => value - KEY_STEP,
  ArrowDown: (value) => value - KEY_STEP,
  ArrowRight: (value) => value + KEY_STEP,
  ArrowUp: (value) => value + KEY_STEP,
  PageDown: (value) => value - KEY_STEP * 4,
  PageUp: (value) => value + KEY_STEP * 4,
  Home: () => 0,
  End: () => 100,
};

const onKey = (event: KeyboardEvent): void => {
  const step = KEYS[event.key];
  if (!step) return;
  event.preventDefault();
  wipe?.cancel();
  split.value = clamp(step(split.value));
};

onMounted(() => {
  if (!compare.value || !motionOn()) return;
  split.value = 100;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      const proxy = { split: 100 };
      wipe = animate(proxy, { split: REST, duration: WIPE_MS, ease: MOTION_EASE.inOut, onUpdate: () => (split.value = proxy.split) });
    },
    { threshold: 0.6 },
  );
  observer.observe(compare.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  wipe?.cancel();
});
</script>

<template>
  <Surface class="sidecar" pad="none">
    <p class="path">{{ path }}</p>
    <div
      ref="compare"
      class="compare"
      :style="{ '--split': `${split}%` }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <div class="side">
        <div v-for="hunk in HUNKS" :key="hunk.id" class="hunk">
          <div v-for="(pair, row) in hunk.pairs" :key="row" class="row" :data-mark="pair.before.mark">
            <span class="num">{{ pair.before.line }}</span>{{ " " }}
            <span class="sign">{{ SIGN[pair.before.mark] }}</span>{{ " " }}
            <span class="code">{{ pair.before.text }}</span>
          </div>
        </div>
      </div>
      <div class="clip">
        <div class="side after">
          <div v-for="hunk in HUNKS" :key="hunk.id" class="hunk">
            <div v-for="(pair, row) in hunk.pairs" :key="row" class="row" :data-mark="pair.after.mark">
              <span class="num">{{ pair.after.line }}</span>{{ " " }}
              <span class="sign">{{ SIGN[pair.after.mark] }}</span>{{ " " }}
              <span class="code">{{ pair.after.text }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="handle">
        <span class="bar" />
        <span
          class="knob"
          role="slider"
          tabindex="0"
          :aria-labelledby="labelledby"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(split)"
          @keydown="onKey"
        >
          <svg class="grip" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7l-4 5 4 5M15 7l4 5-4 5" /></svg>
        </span>
      </div>
    </div>
  </Surface>
</template>

<style scoped>
.sidecar {
  @apply overflow-hidden;
}

.path {
  @apply typo-mono-meta m-0 block border-b border-border px-5 py-3 text-muted;
}

.compare {
  @apply relative cursor-ew-resize touch-pan-y overflow-hidden select-none;
}

.side {
  @apply flex flex-col divide-y divide-border bg-raised py-2;
}

.clip {
  @apply absolute inset-0 overflow-hidden;
  transform: translateX(var(--split));
}

.after {
  transform: translateX(calc(var(--split) * -1));
}

.hunk {
  @apply py-2;
}

.row {
  @apply typo-mono-meta flex h-6 min-w-0 items-center pr-4 whitespace-pre text-fg;
}

.row[data-mark="add"] {
  @apply bg-success-soft;
}

.row[data-mark="remove"] {
  @apply bg-error-soft;
}

.row[data-mark="same"] {
  @apply text-muted;
}

.num {
  @apply w-12 flex-none pr-3 text-right text-muted tabular-nums;
}

.sign {
  @apply w-4 flex-none text-muted;
}

.code {
  @apply min-w-0 truncate;
}

.handle {
  @apply pointer-events-none absolute inset-0;
  transform: translateX(var(--split));
}

.bar {
  @apply absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-primary;
}

.knob {
  @apply pointer-events-auto absolute top-1/2 left-0 grid size-10 -translate-1/2 cursor-ew-resize place-items-center rounded-full border-2 border-primary bg-raised text-primary shadow-md;

  &:focus-visible {
    @apply focus-ring;
  }

  @media (pointer: coarse) {
    @apply size-11;
  }
}

.grip {
  @apply size-5 fill-none stroke-current stroke-2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
