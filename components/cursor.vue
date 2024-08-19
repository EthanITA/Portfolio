<script lang="ts" setup>
import type { CSSProperties } from "vue";

const cursor = useCursor();
const page = usePage();

const position = computed<CSSProperties>(() => ({
  top: `${cursor.position.y}px`,
  left: `${cursor.position.x}px`,
}));
</script>

<template>
  <div
    v-if="page.hasCursor"
    id="cursor"
    :data-type="cursor.state"
    :style="position"
  />
</template>

<style scoped>
#cursor {
  /** styling */
  @apply -translate-x-1/2 -translate-y-1/2 rounded-full;
  @apply bg-primary glass opacity-90;

  /** transition */
  transition-property: height, width, background-color, opacity;
  @apply ease-in-out duration-200;

  /** z position */
  @apply fixed z-[9999] pointer-events-none;
}

#cursor[data-type="default"] {
  @apply size-4 opacity-80;
}

#cursor[data-type="hover"] {
  @apply size-8;
}

#cursor[data-type="focus"] {
  @apply size-10 bg-primary-500;
}
</style>
