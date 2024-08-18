<script lang="ts" setup></script>

<template>
  <div class="hero relative min-h-full">
    <div class="hero-overlay flex pointer-events-none">
      <Wave class="items-center justify-center blur-3xl" />
    </div>
    <div class="hero-content text-gray-700 text-center">
      <div class="max-w-2xl space-y-8">
        <h1 class="text-7xl font-black">
          <span>I'm Marco Dong.</span>
          <br />
          <span class="text-primary">A Full-Stack Developer.</span>
        </h1>
        <p class="text-xl">
          I'm passionate about crafting web app and committed to deliver
          high-quality work.
        </p>
      </div>
    </div>
  </div>
  <Nudge class="absolute left-[50%] bottom-8 -translate-x-1/2" />
</template>

<style scoped></style>
