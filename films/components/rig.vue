<script setup lang="ts">
import type { Shot } from "~~/films/scripts/script";
import { Camera, type View } from "~~/films/utils/camera";

const { shots, at, until } = defineProps<{ shots: Shot[]; at?: number; until: number }>();

const rig = useTemplateRef<HTMLElement>("rig");
const { onFrame, measure } = useFilmContext();

Camera.validate(shots);

let views: View[] | undefined;

onFrame(async (ms) => {
  if (!rig.value) return;
  if (!views) {
    views = await Camera.measure({ shots, rig: rig.value, at: measure });
    rig.value.dataset.landed = views.map((view) => view.scale.toFixed(3)).join(" ");
  }
  const { x, y, scale } = Camera.view({ shots, views, ms, size: { width: rig.value.offsetWidth, height: rig.value.offsetHeight }, from: at, until });
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
