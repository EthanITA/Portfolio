<script setup lang="ts">
import { Kbd } from "@cela/design";
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { SAFE_MARGIN, type Cue } from "~~/films/scripts/script";

const { keys, at, until, beside } = defineProps<{ keys: string; at: number; until: number; beside?: Pick<Cue, "at" | "until"> }>();

const GAP = 24;

const band = useTemplateRef<HTMLElement>("band");
const key = useTemplateRef<HTMLElement>("key");
const { timeline, onFrame } = useFilmContext();

onMounted(() => {
  if (!key.value) return;
  timeline
    .add(key.value, { opacity: [0, 1], y: [12, 0], duration: MOTION_DURATION.base, ease: MOTION_EASE.out }, at)
    .add(key.value, { opacity: [1, 0], duration: MOTION_DURATION.fast, ease: MOTION_EASE.out }, until);
});

let placed = false;
const offset = { x: 0, y: 0 };

const progress = (ms: number, start: number, length: number): number => Math.min(1, Math.max(0, (ms - start) / length));

onFrame((ms) => {
  if (!band.value || !key.value || !beside) return;
  if (!placed) {
    const caption = band.value.parentElement?.querySelector(`[data-caption="${beside.at}"] .film-caption`)?.getBoundingClientRect();
    const caps = key.value.querySelector(".film-key-caps")?.getBoundingClientRect();
    if (!caption || !caps) return;
    const frame = band.value.getBoundingClientRect();
    if (caption.left - GAP - caps.width - frame.left >= SAFE_MARGIN) offset.x = caption.left - GAP - caps.right;
    else offset.y = caption.top - GAP - caps.bottom;
    placed = true;
  }
  const enter = MOTION_EASE.out(progress(ms, beside.at, MOTION_DURATION.base));
  const leave = MOTION_EASE.out(progress(ms, beside.until, MOTION_DURATION.fast));
  const shown = enter * (1 - leave);
  band.value.style.translate = `${offset.x * shown}px ${offset.y * shown}px`;
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
