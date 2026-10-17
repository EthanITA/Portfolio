<script setup lang="ts">
import { MOTION_EASE } from "@cela/design/utils/motion";
import { createTimeline, stagger } from "animejs";
import { AmbientLight, BufferAttribute, BufferGeometry, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Points, PointsMaterial, Scene, TorusKnotGeometry, WebGLRenderer } from "three";

const DURATION = 4000;

const root = useTemplateRef<HTMLElement>("root");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const count = ref(0);

let draw: (ms: number) => void = () => {};

useFilm({ duration: DURATION, seek: (ms) => draw(ms) });

onMounted(() => {
  if (!canvas.value || !root.value) return;
  const renderer = new WebGLRenderer({ canvas: canvas.value, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, canvas.value.clientWidth / canvas.value.clientHeight, 0.1, 100);
  camera.position.z = 7;
  const knot = new Mesh(new TorusKnotGeometry(1, 0.32, 256, 32), new MeshStandardMaterial({ color: 0x7c5cff, roughness: 0.35, metalness: 0.2 }));
  const light = new DirectionalLight(0xffffff, 2.4);
  light.position.set(3, 4, 5);
  const dust = new BufferGeometry().setAttribute("position", new BufferAttribute(Float32Array.from({ length: 1800 }, () => (Math.random() - 0.5) * 9), 3));
  const points = new Points(dust, new PointsMaterial({ color: 0x9b87ff, size: 0.03 }));
  scene.add(knot, points, light, new AmbientLight(0xffffff, 0.5));

  const counter = { value: 0 };
  const timeline = createTimeline({ autoplay: false })
    .add(root.value.querySelectorAll("[data-tile]"), { opacity: [0, 1], y: [48, 0], duration: 700, ease: MOTION_EASE.out, delay: stagger(90) })
    .add(counter, { value: [0, 2700], duration: 2400, ease: MOTION_EASE.inOut }, 400)
    .add(root.value.querySelector("[data-bar]") ?? [], { scaleX: [0, 1], duration: 3200, ease: MOTION_EASE.standard }, 300);

  draw = (ms) => {
    timeline.seek(ms);
    count.value = Math.round(counter.value);
    const t = ms / 1000;
    knot.rotation.set(t * 0.7, t * 1.1, 0);
    points.rotation.y = t * 0.2;
    renderer.render(scene, camera);
  };
  draw(0);
});
</script>

<template>
  <main ref="root" class="calibrate">
    <canvas ref="canvas" class="calibrate-canvas" />
    <section class="calibrate-copy">
      <p class="typo-eyebrow" data-tile>tools/render</p>
      <h1 class="typo-display" data-tile>Calibration</h1>
      <p class="typo-mono-meta" data-tile>frames {{ count }}</p>
      <div class="calibrate-track" data-tile><div class="calibrate-bar" data-bar /></div>
    </section>
  </main>
</template>

<style scoped>
.calibrate {
  @apply relative h-screen w-screen overflow-hidden bg-canvas text-fg;
}
.calibrate-canvas {
  @apply absolute inset-0 size-full;
}
.calibrate-copy {
  @apply absolute bottom-24 left-24 flex flex-col gap-4;
}
.calibrate-track {
  @apply h-1 w-96 overflow-hidden rounded-full bg-sunken;
}
.calibrate-bar {
  @apply h-full w-full origin-left bg-primary;
}
</style>
