<script setup lang="ts">
const PATHS = {
  check: ["M20 6 9 17l-5-5"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  undo: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  redo: ["m15 14 5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H13"],
  send: ["M14.5 21.7a.5.5 0 0 0 .9 0l6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z", "m21.9 2.1-10.9 10.9"],
};

const { name } = defineProps<{ name: keyof typeof PATHS }>();
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-for="d in PATHS[name]" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
.icon {
  @apply size-3.5 flex-none fill-none stroke-current;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
