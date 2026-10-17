<script setup lang="ts">
import type { FeatureBeat } from "~/utils/play/script/typed";

import { REGIONS } from "~/utils/play/regions";

const { beats } = defineProps<{ beats: FeatureBeat[] }>();

// Rounded, since 0.022 * 100 lands a hair under 2.2 and the renderer's crop would snap a pixel taller.
const percent = (fraction: number): string => `${Math.round(fraction * 1e6) / 1e4}%`;

const placed = computed(() =>
  beats.flatMap((beat) => {
    const region = REGIONS[beat.id];
    return region ? [{ id: beat.id, style: { left: percent(region.x), top: percent(region.y), width: percent(region.size), height: percent(region.size) } }] : [];
  }),
);
</script>

<template>
  <span v-for="beat in placed" :key="beat.id" class="beat" :data-beat="beat.id" :style="beat.style" aria-hidden="true" />
</template>

<style scoped>
/* Unpainted boxes the renderer crops each beat's still to. */
.beat {
  @apply pointer-events-none absolute;
}
</style>
