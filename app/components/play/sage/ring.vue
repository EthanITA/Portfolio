<script setup lang="ts">
import type { Look } from "~/utils/play/sage";

const { look } = defineProps<{ look: Look }>();

const R = 41;
const at = (degrees: number, radius: number): string => {
  const angle = (degrees * Math.PI) / 180;
  return `${(60 + radius * Math.cos(angle)).toFixed(3)} ${(60 + radius * Math.sin(angle)).toFixed(3)}`;
};

// Starts at -45 degrees like the Swift drawing, so the gap sits where the product puts it.
const CIRCLE = `M${at(-45, R)} A${R} ${R} 0 1 1 ${at(135, R)} A${R} ${R} 0 1 1 ${at(-45, R)}`;
const DOT = at(-45, R).split(" ");
const THREAD = { from: at(-45, 50).split(" "), to: at(-45, 56).split(" ") };
const WAVE = `M40 60 ${Array.from({ length: 7 }, (_, index) => {
  const step = index + 1;
  const swing = 8 * Math.sin((Math.PI * step) / 8);
  return `L${40 + 5 * step} ${(60 + (step % 2 ? -swing : swing)).toFixed(2)}`;
}).join(" ")} L80 60`;
</script>

<template>
  <svg class="glyph" :data-look="look" viewBox="0 0 120 120" aria-hidden="true">
    <g class="spin">
      <path class="arc" data-ring-arc :d="CIRCLE" />
      <path class="tail" data-ring-tail :d="CIRCLE" />
      <path class="head" data-ring-head :d="CIRCLE" />
      <circle class="dot" :cx="DOT[0]" :cy="DOT[1]" r="6.5" />
      <g class="thread">
        <line :x1="THREAD.from[0]" :x2="THREAD.to[0]" :y1="THREAD.from[1]" :y2="THREAD.to[1]" />
        <circle :cx="THREAD.to[0]" :cy="THREAD.to[1]" r="4.5" />
      </g>
    </g>
    <path class="line" data-for="waiting" d="M49 60H71" />
    <path class="line" data-for="askingBack" d="M53 60H67" />
    <path class="line" data-for="working" d="M43 60H77" />
    <path class="line" data-for="needsYou" d="M42 60H78" />
    <path class="wave" :d="WAVE" />
  </svg>
</template>

<style scoped>
.glyph {
  @apply size-5.5 flex-none overflow-visible;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.spin {
  transform: rotate(calc(var(--turn, 0) * 1deg));
  transform-box: view-box;
  transform-origin: 60px 60px;
}

/* White in both themes: the island is the black notch, as macOS draws it. */
.arc {
  @apply stroke-white;
  stroke-width: 12;
}

.tail {
  @apply stroke-white;
  stroke-width: 5.4;
}

.head {
  @apply stroke-primary opacity-0;
  stroke-width: 13;
}

.dot,
.thread circle {
  @apply fill-primary opacity-0;
}

.thread line {
  @apply stroke-primary;
  stroke-width: 3;
}

.thread {
  @apply opacity-0;
}

.line {
  @apply stroke-primary opacity-0;
  stroke-width: 4.5;
}

.wave {
  @apply stroke-primary opacity-0;
  stroke-width: 3.5;
  transform: scaleY(var(--voice, 0.35));
  transform-box: view-box;
  transform-origin: 60px 60px;
}

.glyph[data-look="working"] .arc,
.glyph[data-look="working"] .tail,
.glyph[data-look="needsYou"] .arc {
  @apply stroke-primary;
}

.glyph[data-look="needsYou"] .arc {
  stroke-width: 15;
}

.glyph[data-look="needsYou"] .tail {
  @apply opacity-0;
}

.glyph[data-look="thinking"] .head,
.glyph[data-look="askingBack"] .dot,
.glyph[data-look="working"] .thread,
.glyph[data-look="listening"] .wave {
  @apply opacity-100;
}

.glyph[data-look="waiting"] .line[data-for="waiting"] {
  @apply opacity-60;
}

.glyph[data-look="askingBack"] .line[data-for="askingBack"],
.glyph[data-look="working"] .line[data-for="working"] {
  @apply opacity-100;
}

.glyph[data-look="needsYou"] .line[data-for="needsYou"] {
  @apply opacity-25;
  stroke-width: 7;
}
</style>
