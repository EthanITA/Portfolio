<script lang="ts" setup>
const expanded = ref(false);
</script>

<template>
  <div class="h-full bg-white card">
    <figure class="w-full">
      <slot name="creativity" />
    </figure>
    <div class="card-body overflow-hidden">
      <h3 class="card-title">
        <slot name="header" />
      </h3>
      <div
        :class="{
          'h-full': $slots.creativity,
        }"
        class="overflow-hidden"
      >
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
