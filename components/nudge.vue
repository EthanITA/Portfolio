<script lang="ts" setup>
const page = usePage();
</script>

<template>
  <div
    :class="{
      'opacity-0': page.hasScrolled,
      'opacity-100': !page.hasScrolled,
    }"
    class="flex flex-col justify-center items-center pointer-events-none transition-opacity duration-500"
  >
    <div class="mouse"></div>
    <p class="font-bold text-primary mt-4 tracking-[0.5rem] indent-2 uppercase">
      Scroll
    </p>
  </div>
</template>

<style scoped>
p {
  animation:
    colorText 5s ease-out infinite,
    nudgeText 5s ease-out infinite;
}

.mouse {
  background: #ff7053
    linear-gradient(transparent 0%, transparent 50%, #ffffff 50%, #ffffff 100%);
  position: relative;
  width: 36px;
  height: 66px;
  border-radius: 100px;
  background-size: 100% 200%;
  animation:
    colorSlide 5s linear infinite,
    nudgeMouse 5s ease-out infinite;
}
.mouse:before,
.mouse:after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  margin: auto;
}
.mouse:before {
  width: calc(36px - 6px);
  height: calc(66px - 6px);
  background-color: #ffb0a0;
  border-radius: 100px;
}
.mouse:after {
  @apply bg-primary;
  width: 10px;
  height: 10px;
  border-radius: 100%;
  animation: trackBallSlide 10s linear infinite;
}

@keyframes colorSlide {
  0% {
    background-position: 0% 100%;
  }
  20% {
    background-position: 0% 0%;
  }
  21% {
    @apply bg-primary;
  }
  29.99% {
    background-color: #ffffff;
    background-position: 0% 0%;
  }
  30% {
    @apply bg-primary;
    background-position: 0% 100%;
  }
  50% {
    background-position: 0% 0%;
  }
  51% {
    @apply bg-primary;
  }
  59% {
    background-color: #ffffff;
    background-position: 0% 0%;
  }
  60% {
    @apply bg-primary;
    background-position: 0% 100%;
  }
  80% {
    background-position: 0% 0%;
  }
  81% {
    @apply bg-primary;
  }
  90%,
  100% {
    background-color: #ffffff;
  }
}

@keyframes trackBallSlide {
  0% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
  6% {
    opacity: 1;
    transform: scale(0.9) translateY(5px);
  }
  14% {
    opacity: 0;
    transform: scale(0.4) translateY(40px);
  }
  15%,
  19% {
    opacity: 0;
    transform: scale(0.4) translateY(-10px);
  }
  28%,
  29.99% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
  30% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
  36% {
    opacity: 1;
    transform: scale(0.9) translateY(5px);
  }
  44% {
    opacity: 0;
    transform: scale(0.4) translateY(40px);
  }
  45%,
  49% {
    opacity: 0;
    transform: scale(0.4) translateY(-10px);
  }
  58%,
  59.99% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
  60% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
  66% {
    opacity: 1;
    transform: scale(0.9) translateY(5px);
  }
  74% {
    opacity: 0;
    transform: scale(0.4) translateY(40px);
  }
  75%,
  79% {
    opacity: 0;
    transform: scale(0.4) translateY(-10px);
  }
  88%,
  100% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
}

@keyframes nudgeMouse {
  0% {
    transform: translateY(0);
  }
  20% {
    transform: translateY(8px);
  }
  30% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(8px);
  }
  60% {
    transform: translateY(0);
  }
  80% {
    transform: translateY(8px);
  }
  90% {
    transform: translateY(0);
  }
}

@keyframes nudgeText {
  0% {
    transform: translateY(0);
  }
  20% {
    transform: translateY(2px);
  }
  30% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(2px);
  }
  60% {
    transform: translateY(0);
  }
  80% {
    transform: translateY(2px);
  }
  90% {
    transform: translateY(0);
  }
}

@keyframes colorText {
  21% {
    @apply text-primary;
  }
  30% {
    @apply text-white;
  }
  51% {
    @apply text-primary;
  }
  60% {
    @apply text-white;
  }
  81% {
    @apply text-primary;
  }
  90% {
    @apply text-white;
  }
}
</style>
