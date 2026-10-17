<script setup lang="ts">
import type { PlayBeat } from "~/utils/play/script/beats";

const { beats } = defineProps<{ beats: PlayBeat[] }>();
</script>

<template>
  <span
    v-for="beat in beats"
    :key="beat.id"
    class="beat"
    :data-beat="beat.id"
    :style="{ left: `${beat.region.x * 100}%`, top: `${beat.region.y * 100}%`, width: `${beat.region.size * 100}%`, height: `${beat.region.size * 100}%` }"
    aria-hidden="true"
  />
</template>

<style scoped>
/* Unpainted boxes the renderer crops each beat's still to. */
.beat {
  @apply pointer-events-none absolute;
}
</style>
