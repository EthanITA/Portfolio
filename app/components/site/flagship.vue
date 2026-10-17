<script setup lang="ts">
import { Surface } from "@cela/design";
import { type AnimatableObject, createAnimatable, spring } from "animejs";

import { type FrameFormat, screen } from "~/utils/scroll/frames";
import type { Product } from "~/utils/site/films";
import { SPRING, motionOn } from "~/utils/site/motion";
import type { Run } from "~/utils/site/text";

const TILT = 2;
const SIZES = "(min-width: 768px) 320px, 100vw";

const { slug, name, text, to, link } = defineProps<{
  slug: Product;
  name: string;
  text: Run[];
  to: string;
  link: string;
}>();

const poster = useTemplateRef<HTMLElement>("poster");
let tilt: AnimatableObject | undefined;
let box: DOMRect | undefined;

const srcset = (format: FrameFormat): string => `${screen(slug, 800, format)} 800w, ${screen(slug, 1600, format)} 1600w`;

const fine = (): boolean => matchMedia("(hover: hover) and (pointer: fine)").matches;

const onEnter = (): void => {
  box = poster.value?.getBoundingClientRect();
};

const onMove = (event: PointerEvent): void => {
  if (!poster.value || !box || !motionOn() || !fine()) return;
  tilt ??= createAnimatable(poster.value, { rotateX: {}, rotateY: {}, ease: spring(SPRING.gentle) });
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
  <Surface v-press as="article" class="flagship" :data-flagship="slug" @pointerenter="onEnter" @pointermove="onMove" @pointerleave="onLeave">
    <div ref="poster" class="poster" :data-flagship-poster="slug" aria-hidden="true">
      <picture>
        <source type="image/avif" :srcset="srcset('avif')" :sizes="SIZES" />
        <source type="image/webp" :srcset="srcset('webp')" :sizes="SIZES" />
        <img class="image" :src="screen(slug, 800, 'webp')" width="1600" height="1000" alt="" loading="lazy" decoding="async" />
      </picture>
    </div>
    <h2 class="name">{{ name }}</h2>
    <p class="text"><SiteRuns :runs="text" /></p>
    <NuxtLink class="more" :to="to">{{ link }}</NuxtLink>
  </Surface>
</template>

<style scoped>
.flagship {
  @apply relative flex flex-col gap-3 transition-[translate,scale,box-shadow] duration-(--duration-snappy) ease-out perspective-midrange;
}

.poster {
  @apply mb-2 aspect-16/10 w-full overflow-hidden rounded-field bg-sunken;
}

.image {
  @apply block size-full object-cover;
}

.name {
  @apply typo-heading-xl m-0;
}

.text {
  @apply typo-body-md text-muted;
}

.more {
  @apply typo-body-strong mt-auto inline-flex min-h-11 w-fit items-center text-primary underline-offset-4 after:absolute after:inset-0 after:content-[''];

  &:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .flagship:hover {
    @apply -translate-y-1 shadow-md;
  }

  .flagship:hover .more {
    @apply underline;
  }
}
</style>
