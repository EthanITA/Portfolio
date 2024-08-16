<script lang="ts" setup>
const page = usePage();
</script>

<template>
  <div class="h-full w-2 bg-primary-200 isolate z-50 shadow">
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
