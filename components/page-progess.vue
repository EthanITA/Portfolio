<script lang="ts" setup>
const pageProgress = usePageProgress();
</script>

<template>
  <div class="h-full w-2 bg-primary-500/10 isolate z-50">
    <div
      :class="{
        'rounded-b-none': pageProgress.percentage === 100,
      }"
      :style="{ height: `${pageProgress.percentage}%` }"
      class="h-full bg-primary-500 rounded-b-full"
    />
  </div>
</template>

<style scoped></style>
