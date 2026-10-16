<script setup lang="ts">
import { Surface } from "@cela/design";
import { type AnimatableObject, createAnimatable, spring } from "animejs";

import type { Product } from "~/utils/site/films";
import { SPRING, motionOn } from "~/utils/site/motion";
import type { Run } from "~/utils/site/text";

const TILT = 2;

const { slug, name, text, status, to, link } = defineProps<{
  slug: Product;
  name: string;
  text: Run[];
  status: string;
  to: string;
  link: string;
}>();

const poster = useTemplateRef<HTMLElement>("poster");
let tilt: AnimatableObject | undefined;

const fine = (): boolean => matchMedia("(hover: hover) and (pointer: fine)").matches;

const onMove = (event: PointerEvent): void => {
  if (!poster.value || !motionOn() || !fine()) return;
  tilt ??= createAnimatable(poster.value, { rotateX: {}, rotateY: {}, ease: spring(SPRING.gentle) });
  const box = poster.value.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - 0.5;
  const y = (event.clientY - box.top) / box.height - 0.5;
  tilt.rotateY?.(x * TILT * 2);
  tilt.rotateX?.(-y * TILT * 2);
};

const onLeave = (): void => {
  tilt?.rotateX?.(0);
  tilt?.rotateY?.(0);
};

onBeforeUnmount(() => tilt?.revert());
</script>

<template>
  <Surface v-press as="article" class="flagship" :data-flagship="slug" @pointermove="onMove" @pointerleave="onLeave">
    <div ref="poster" class="poster" :data-flagship-poster="slug" aria-hidden="true" />
    <h2 class="name">{{ name }}</h2>
    <p class="text"><SiteRuns :runs="text" /></p>
    <span class="status"><span class="status-dot" aria-hidden="true" />{{ status }}</span>
    <NuxtLink class="more" :to="to">{{ link }}</NuxtLink>
  </Surface>
</template>

<style scoped>
.flagship {
  @apply flex flex-col gap-3 perspective-midrange;
}

.poster {
  @apply mb-2 aspect-16/10 w-full rounded-field bg-sunken;
}

.name {
  @apply typo-heading-xl m-0;
}

.text {
  @apply typo-body-md text-muted;
}

.status {
  @apply chip-look w-fit;
}

.more {
  @apply typo-body-strong mt-auto inline-flex min-h-11 w-fit items-center text-primary underline-offset-4;

  &:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .flagship:hover {
    @apply -translate-y-1 shadow-md;
  }

  .more:hover {
    @apply underline;
  }
}
</style>
