<script setup lang="ts">
import type { Driver } from "~/utils/play/reel";

import { Chip } from "@cela/design";

const { play } = defineProps<{ play?: { driver: Driver; take: () => void; demo: () => void } }>();

// The home's crossfade leaves play undefined between two playgrounds, so the label holds instead of flashing back.
const last = ref<Driver>();
watch(
  () => play?.driver,
  (next) => {
    if (next) last.value = next;
  },
  { immediate: true },
);
const driver = computed(() => play?.driver ?? last.value);

const onClick = (): void => {
  if (play?.driver === "demo") play.take();
  else play?.demo();
};
</script>

<template>
  <Chip class="play-chip" data-play-chip :disabled="!driver" :selected="driver === 'visitor'" @click="onClick">
    {{ driver === "visitor" ? "Play the demo" : "Take over" }}
  </Chip>
</template>

<style scoped>
.play-chip {
  @apply relative hit-area;
}
</style>
