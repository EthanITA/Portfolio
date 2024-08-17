<script lang="ts" setup>
import type { WatchStopHandle } from "vue";

const page = usePage();
const cursor = useCursor();

const unwatch = ref<WatchStopHandle>();

const updateProgress = () =>
  page.setProgress((cursor.position.y / window.innerHeight) * 100);

const drag = () => {
  unwatch.value = watch(() => cursor.position.y, updateProgress);
  window.addEventListener("mouseup", () => {
    if (unwatch) {
      unwatch.value?.();
      unwatch.value = undefined;
    }
  });
};
</script>

<template>
  <div
    :class="{
      'hover:w-4': !unwatch,
      'w-4': unwatch,
    }"
    class="cursor-pointer h-full w-2 bg-primary-200 isolate z-50 shadow transition-all"
    draggable="true"
    @click="updateProgress"
    @mousedown="drag"
  >
    <div
      :class="{
        'rounded-b-none': page.progress === 100,
      }"
      :style="{ height: `${page.progress}%` }"
      class="h-full bg-primary rounded-b-full"
    />
  </div>
</template>

<style scoped></style>
