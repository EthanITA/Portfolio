<script setup lang="ts">
import type { Product } from "~/utils/site/films";
import type { ProductPage } from "~/utils/site/products";

const { slug, decides } = defineProps<{ slug: Product; decides: ProductPage["decides"] }>();

const id = computed(() => `${slug}-decides`);
</script>

<template>
  <section class="decides wrap" :aria-labelledby="id">
    <div class="intro">
      <h2 :id="id" v-enter.words class="heading">{{ decides.heading }}</h2>
      <p v-enter class="line">{{ decides.line }}</p>
    </div>
    <SiteDecideShell v-if="slug === 'shell'" />
    <SiteDecideSage v-else-if="slug === 'sage'" />
    <SiteDecideSidecar v-else :labelledby="id" />
  </section>
</template>

<style scoped>
.decides {
  @apply flex flex-col gap-8;
}

.intro {
  @apply flex flex-col gap-3;
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.line {
  @apply typo-body-lg measure text-pretty text-muted;
}
</style>
