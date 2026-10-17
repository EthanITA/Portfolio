<script setup lang="ts">
const { items } = defineProps<{ items: string[] }>();
</script>

<template>
  <ul class="tags">
    <li v-for="item in items" :key="item" class="tag">{{ item }}</li>
  </ul>
</template>

<style scoped>
.tags {
  @apply m-0 flex list-none flex-wrap gap-1 p-0;
}

.tag {
  @apply typo-mono-micro rounded-md border border-border bg-sunken px-1.5 py-0.5 leading-tight text-muted print:py-px;
}
</style>
