<script setup lang="ts">
const { title = "Marco Dong", sub = "" } = defineProps<{ title?: string; sub?: string }>();

// The renderer resolves no CSS custom properties, so the card spells out @cela/design's light palette.
const ink = { color: "#17151e" };
const muted = { color: "#6e6882" };
const violet = { backgroundColor: "#7c3aed" };
</script>

<template>
  <div class="flex h-full w-full flex-col justify-between p-20" :style="{ backgroundColor: '#f9f8f5', fontFamily: 'Plus Jakarta Sans' }">
    <div class="flex items-center gap-5">
      <div class="flex h-14 w-48 items-center justify-center rounded-full" :style="{ backgroundColor: ink.color }">
        <div class="h-1 w-20 rounded-full" :style="violet" />
      </div>
      <span class="text-3xl font-bold tracking-tight" :style="ink">Marco Dong</span>
    </div>
    <div class="flex flex-col gap-6">
      <span class="text-7xl font-bold tracking-tight" :style="ink">{{ title }}</span>
      <span v-if="sub" class="text-4xl" :style="muted">{{ sub }}</span>
    </div>
    <div class="flex items-center gap-6">
      <div class="h-1.5 w-40 rounded-full" :style="violet" />
      <span class="text-2xl" :style="{ ...muted, fontFamily: 'DM Mono' }">madong.me</span>
    </div>
  </div>
</template>
