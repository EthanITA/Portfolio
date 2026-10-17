<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import type { Shot } from "~~/films/scripts/script";
import { Camera, type View } from "~~/films/utils/camera";

const { shots, at, until } = defineProps<{ shots: Shot[]; at?: number; until?: number }>();

const rig = useTemplateRef<HTMLElement>("rig");
const { timeline, onFrame, measure } = useFilmContext();

Camera.validate(shots);

onMounted(() => {
  if (!rig.value) return;
  if (at) timeline.add(rig.value, { opacity: [0, 1], duration: MOTION_DURATION.slower, ease: MOTION_EASE.inOut }, at);
  if (until) timeline.add(rig.value, { opacity: [1, 0], duration: MOTION_DURATION.slower, ease: MOTION_EASE.inOut }, until);
});

let views: View[] | undefined;

onFrame(async (ms) => {
  if (!rig.value) return;
  views ??= await Camera.measure({ shots, rig: rig.value, at: measure });
  const { x, y, scale } = Camera.view({ shots, views, ms });
  rig.value.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
});
</script>

<template>
  <div ref="rig" class="film-rig">
    <slot />
  </div>
</template>

<style scoped>
.film-rig {
  @apply absolute inset-0 origin-top-left;
}
</style>
