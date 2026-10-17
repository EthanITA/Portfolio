<script setup lang="ts">
import { Kbd } from "@cela/design";
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { SAFE_MARGIN, type Cue } from "~~/films/scripts/script";

const { keys, at, until, beside = [] } = defineProps<{ keys: string; at: number; until: number; beside?: Pick<Cue, "at" | "until">[] }>();

const GAP = 24;
const JOIN = 400;

const band = useTemplateRef<HTMLElement>("band");
const key = useTemplateRef<HTMLElement>("key");
const { timeline, onFrame } = useFilmContext();

onMounted(() => {
  if (!key.value) return;
  timeline
    .add(key.value, { opacity: [0, 1], y: [12, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at)
    .add(key.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});

type Offset = { x: number; y: number };

let offsets: Offset[] = [];

const progress = (ms: number, start: number, length: number): number => Math.min(1, Math.max(0, (ms - start) / length));

const toward = (from: Offset, to: Offset, amount: number): Offset => ({ x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount });

// Captions that follow each other within JOIN hand the key straight on, so it glides between them instead of bouncing to the centre.
const pose = (ms: number): Offset => {
  let current = { x: 0, y: 0 };
  for (const [index, caption] of beside.entries()) {
    const offset = offsets[index];
    if (ms < caption.at || !offset) break;
    current = toward(current, offset, MOTION_EASE.out(progress(ms, caption.at, MOTION_DURATION.base)));
    const next = beside[index + 1];
    if (!next || next.at - caption.until > JOIN) current = toward(current, { x: 0, y: 0 }, MOTION_EASE.out(progress(ms, caption.until, MOTION_DURATION.fast)));
  }
  return current;
};

onFrame((ms) => {
  if (!band.value || !key.value || !beside.length) return;
  if (!offsets.length) {
    const caps = key.value.querySelector(".film-key-caps")?.getBoundingClientRect();
    const frame = band.value.getBoundingClientRect();
    const captions = beside.map((caption) => band.value?.parentElement?.querySelector(`[data-caption="${caption.at}"] .film-caption`)?.getBoundingClientRect());
    if (!caps || captions.some((caption) => !caption)) return;
    offsets = captions.map((caption) => {
      if (!caption) return { x: 0, y: 0 };
      if (caption.left - GAP - caps.width - frame.left >= SAFE_MARGIN) return { x: caption.left - GAP - caps.right, y: 0 };
      return { x: 0, y: caption.top - GAP - caps.bottom };
    });
  }
  const { x, y } = pose(ms);
  band.value.style.translate = `${x}px ${y}px`;
});
</script>

<template>
  <div ref="band" class="film-key-band">
    <div ref="key" class="film-key">
      <Kbd class="film-key-caps" :keys="keys" />
    </div>
  </div>
</template>

<style scoped>
.film-key-band {
  @apply pointer-events-none absolute inset-x-0 bottom-16 flex h-18 items-center justify-center;
}
.film-key {
  @apply opacity-0;
}
.film-key-caps {
  @apply scale-300;
}
</style>
