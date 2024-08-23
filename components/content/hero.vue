<script lang="ts" setup></script>

<template>
  <div class="hero relative min-h-full">
    <div class="hero-overlay flex pointer-events-none absolute w-screen">
      <Wave class="items-center justify-center blur-3xl" />
    </div>
    <div class="hero-content text-gray-700 text-center">
      <div class="max-w-2xl space-y-12">
        <h1 class="text-7xl font-black">
          <span>I'm Marco Dong.</span>
          <br />
          <span class="text-primary">A Full-Stack Developer.</span>
        </h1>
        <p>
          I'm passionate about crafting web app and dedicated to go above and
          beyond the minimum standards.
        </p>
      </div>
    </div>
  </div>
  <Nudge class="absolute left-[50%] bottom-8 -translate-x-1/2" />
</template>

<style scoped></style>
