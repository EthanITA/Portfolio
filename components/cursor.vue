<script lang="ts" setup>
const cursor = useCursor();
const page = usePage();
</script>

<template>
  <div
    v-show="page.hasCursor"
    :style="{
      width: `${cursor.size.w}px`,
      height: `${cursor.size.h}px`,
      top: `${cursor.position.y}px`,
      left: `${cursor.position.x}px`,
    }"
    class="fixed bg-primary -translate-x-1/2 -translate-y-1/2 glass opacity-90 shadow-primary rounded-full duration-200 transition-[height,width] pointer-events-none ease-in-out z-50"
  ></div>
</template>

<style scoped></style>
