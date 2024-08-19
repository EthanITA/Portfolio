<script lang="ts" setup>
const expanded = ref(false);
</script>

<template>
  <div class="h-full bg-white card">
    <div class="card-body overflow-hidden">
      <h3 class="card-title">
        <slot name="header" />
      </h3>
      <div class="overflow-hidden">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card,
.card-body {
  @apply overflow-x-hidden;
}
</style>
