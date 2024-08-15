<template>
  <canvas ref="waveCanvas" class="w-full" height="400" width="800"></canvas>
</template>

<script lang="ts" setup>
import { gsap } from "gsap";

const wave = ref<any>({
  y: 200,
  length: 0.01,
  amplitude: 25,
  frequency: 0.01,
});
const increment = ref(0);

onMounted(() => {
  drawWave();
  animateWaveProperties();
});

const waveCanvas = ref<HTMLCanvasElement | null>(null);

function getRandomValue(base: number, variance: number): number {
  return base + (Math.random() - 0.5) * variance * 2;
}

function drawWave() {
  const canvas = waveCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#ffb0a0"); // primary-300
  gradient.addColorStop(0.8, "#ffd0c7"); // primary-200
  gradient.addColorStop(1, "#ffe6e1"); // primary-100

  const animateWave = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);

    for (let i = 0; i < canvas.width; i++) {
      ctx.lineTo(
        i,
        wave.value.y +
          Math.sin(i * wave.value.length + increment.value) *
            wave.value.amplitude,
      );
    }

    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    increment.value += wave.value.frequency;

    requestAnimationFrame(animateWave);
  };

  animateWave();
}

function animateWaveProperties() {
  const randomizeProperties = () => {
    gsap.to(wave.value, {
      duration: 5,
      y: getRandomValue(200, 50),
      amplitude: getRandomValue(50, 20),
      length: getRandomValue(0.01, 0.005),
      frequency: getRandomValue(0.02, 0.005),
      ease: "power1.inOut",
      onComplete: randomizeProperties,
    });
  };

  randomizeProperties();
}
</script>

<style scoped></style>
