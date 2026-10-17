<script setup lang="ts">
import type { Product } from "~/utils/site/films";
import type { Stat } from "~/utils/site/products";

const { slug, numbers } = defineProps<{ slug: Product; numbers: Stat[] }>();
</script>

<template>
  <section class="numbers wrap" :aria-labelledby="`${slug}-numbers`">
    <h2 :id="`${slug}-numbers`" v-enter.words class="heading">The numbers</h2>
    <ul class="row">
      <li v-for="stat in numbers" :key="stat.label" v-enter.stagger class="stat">
        <SiteCount class="value" :to="stat.to" :before="stat.before" :after="stat.after" />
        <span class="label">{{ stat.label }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.numbers {
  @apply flex flex-col gap-8;
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.row {
  @apply m-0 grid list-none grid-cols-2 gap-x-6 gap-y-8 border-t border-border p-0 pt-8 lg:grid-cols-4;
}

.stat {
  @apply flex flex-col gap-2;
}

.value {
  @apply font-mono text-5xl font-medium tracking-tight text-fg tabular-nums;
}

.label {
  @apply typo-body-md max-w-56 text-pretty text-muted;
}
</style>
