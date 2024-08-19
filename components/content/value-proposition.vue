<script lang="ts" setup></script>

<template>
  <div class="max-w-4xl md:mx-auto py-16 space-y-8 mx-4">
    <h2>Values</h2>
    <div class="grid grid-cols-2 gap-4 md:-mx-8">
      <ContentValueQuality />
      <ContentValueTransparency class="col-span-1" />
      <ContentValueIntegrity class="col-span-1" />
    </div>
    <ContentBrands class="mx-auto" />
  </div>
</template>

<style scoped>
p {
  @apply mt-2;
}
</style>
