<script lang="ts" setup>
import type { WatchStopHandle } from "vue";

const page = usePage();
const cursor = useCursor();

const hovering = ref(false);

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
    class="h-full justify-end w-4 flex z-50 cursor-pointer"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div
      :class="{
        'w-full': unwatch || hovering,
      }"
      class="w-2 bg-primary-200 transition-all shadow"
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
  </div>
</template>

<style scoped></style>
