<script lang="ts" setup>
const cursor = useCursor();
const page = usePage();
</script>

<template>
  <div
    v-show="page.hasCursor"
    id="cursor"
    :data-type="cursor.state"
    :style="{
      top: `${cursor.position.y}px`,
      left: `${cursor.position.x}px`,
    }"
    class="-translate-x-1/2 -translate-y-1/2 rounded-full"
  ></div>
</template>

<style scoped>
#cursor {
  @apply bg-primary glass shadow-primary opacity-90
  fixed z-[9999] pointer-events-none;

  transition-property: height, width, background-color, opacity;
  @apply ease-in-out duration-200;
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
