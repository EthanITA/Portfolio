<script setup lang="ts">
import type { NuxtError } from "#app";

const { error } = defineProps<{ error: NuxtError }>();

useSeoMeta({ title: String(error.status), robots: "noindex, follow" });
</script>

<template>
  <NuxtLayout>
    <section class="lost wrap">
      <h1 class="title">There's nothing at this address.</h1>
      <NuxtLink class="home" to="/">Back to the start</NuxtLink>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.lost {
  @apply flex flex-col gap-6 pt-24 pb-12;
}

.title {
  @apply m-0 text-4xl font-bold tracking-tight text-balance sm:text-6xl;
}

.home {
  @apply typo-heading-lg w-fit text-primary underline-offset-4;

  &:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .home:hover {
    @apply underline;
  }
}
</style>
