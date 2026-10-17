<script setup lang="ts">
import type { FeatureBeat } from "~/utils/play/script/typed";

import { REGIONS } from "~/utils/play/regions";

const { beats } = defineProps<{ beats: FeatureBeat[] }>();

const placed = computed(() =>
  beats.flatMap((beat) => {
    const region = REGIONS[beat.id];
    return region ? [{ id: beat.id, style: { left: `${region.x}px`, top: `${region.y}px`, width: `${region.width}px`, height: `${region.height}px` } }] : [];
  }),
);
</script>

<template>
  <span v-for="beat in placed" :key="beat.id" class="beat" :data-beat="beat.id" :style="beat.style" aria-hidden="true" />
</template>

<style scoped>
/* Unpainted boxes the renderer crops each beat's still to, placed in px of the beat's own frame. */
.beat {
  @apply pointer-events-none absolute;
}
</style>
