<script setup lang="ts">
import type { NuxtError } from "#app";

import { PHONE_REST_BAND } from "~/utils/stage/camera";

const { error } = defineProps<{ error: NuxtError }>();

useSeoMeta({ title: String(error.status) });
</script>

<template>
  <NuxtLayout>
    <section class="lost" :style="{ '--island-bottom': PHONE_REST_BAND.bottom }">
      <SiteMount name="hero">
        <LazyStageHero lost />
      </SiteMount>
      <div class="note">
        <h1 v-enter.now.words.wide class="title">There's nothing at this address.</h1>
        <NuxtLink v-enter.now="200" v-press class="btn btn-primary home" to="/">Back to the start</NuxtLink>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
/* Under lg the island rests in the home's phone band, so the note starts 8 px under it as the home's copy does. */
.lost {
  @apply relative -mt-20 flex h-svh min-h-160 flex-col justify-end overflow-hidden pt-20 pb-16 max-lg:justify-start max-lg:pt-[max(13rem,calc(var(--island-bottom)*100svh_+_0.5rem))] sm:pb-24;
}

.note {
  @apply relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 text-center sm:px-8;
}

.title {
  @apply m-0 text-4xl font-bold tracking-tight text-balance sm:text-5xl;
}

.home {
  @apply min-h-11 justify-center px-5;

  &:focus-visible {
    @apply focus-ring;
  }
}
</style>
