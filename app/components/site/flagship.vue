<script setup lang="ts">
import { Surface } from "@cela/design";
import { type AnimatableObject, createAnimatable, spring } from "animejs";

import { type FrameFormat, sequencePath } from "~/utils/scroll/frames";
import type { Theme } from "~/utils/scroll/sequence";
import type { Product } from "~/utils/site/films";
import { SPRING, motionOn } from "~/utils/site/motion";
import type { Run } from "~/utils/site/text";

const TILT = 2;
const THEMES: Theme[] = ["light", "dark"];
const SIZES = "(min-width: 768px) 320px, 100vw";

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

const still = (theme: Theme, width: 800 | 1600, format: FrameFormat): string => sequencePath(`${theme}/screens/${slug}-${width}`, format);
const srcset = (theme: Theme, format: FrameFormat): string => `${still(theme, 800, format)} 800w, ${still(theme, 1600, format)} 1600w`;

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
    <div ref="poster" class="poster" :data-flagship-poster="slug" aria-hidden="true">
      <picture v-for="theme in THEMES" :key="theme" class="still" :data-still="theme">
        <source type="image/avif" :srcset="srcset(theme, 'avif')" :sizes="SIZES" />
        <source type="image/webp" :srcset="srcset(theme, 'webp')" :sizes="SIZES" />
        <img class="image" :src="still(theme, 800, 'webp')" width="1600" height="1000" alt="" loading="lazy" decoding="async" />
      </picture>
    </div>
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
  @apply mb-2 aspect-16/10 w-full overflow-hidden rounded-field bg-sunken;
}

.image {
  @apply block size-full object-cover;
}

:root[data-theme="dark"] .still[data-still="light"],
:root:not([data-theme="dark"]) .still[data-still="dark"] {
  @apply hidden;
}

.name {
  @apply typo-heading-xl m-0;
}

.text {
  @apply typo-body-md text-muted;
}

.status {
  @apply chip-look;
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
