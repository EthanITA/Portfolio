<script lang="ts" setup></script>

<template>
  <div class="max-w-6xl md:mx-auto py-16 mx-4">
    <h2>Making an impact that matters</h2>
    <div class="grid grid-cols-2 gap-4 md:-mx-4">
      <ContentValueQuality class="col-span-full" />
      <ContentValueTransparency />
      <ContentValueIntegrity />
    </div>
    <ContentBrands class="mt-12" />
  </div>
</template>

<style scoped>
p {
  @apply mt-2;
}
</style>
