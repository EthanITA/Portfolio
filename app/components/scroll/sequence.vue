<script setup lang="ts">
const { beats, closing } = defineProps<{ beats: string[]; closing: string }>();
</script>

<template>
  <section>
    <p v-for="beat in beats" :key="beat">{{ beat }}</p>
    <p>{{ closing }}</p>
  </section>
</template>
