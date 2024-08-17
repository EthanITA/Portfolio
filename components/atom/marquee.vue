<script lang="ts" setup></script>

<template>
  <div class="overflow-x-hidden relative h-fit">
    <div class="w-max flex relative">
      <div class="marquee animate-marquee">
        <slot />
      </div>

      <div class="absolute top-0 marquee animate-marquee2">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

@keyframes marquee2 {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(0);
  }
}

.marquee {
  @apply flex whitespace-nowrap;
}

.marquee > * {
  @apply h-16 w-auto mx-4;
}

.animate-marquee {
  animation: marquee 30s linear infinite;
}

.animate-marquee2 {
  animation: marquee2 30s linear infinite;
}
</style>
