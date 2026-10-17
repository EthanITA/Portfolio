<script setup lang="ts">
import type { Seekable } from "#shared/types/seekable";

import { createSequenceScene, type Quads, type SequenceScene } from "~/utils/scroll/scene";
import { SEQUENCE } from "~/utils/scroll/sequence";

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");

let scene: SequenceScene | undefined;
let mounted: () => void = () => {};
const created = new Promise<void>((resolve) => (mounted = resolve));

onMounted(() => {
  if (!canvas.value) return;
  scene = createSequenceScene({ canvas: canvas.value });
  scene.seek(0);
  mounted();
});

onBeforeUnmount(() => scene?.dispose());

defineExpose<Seekable & { ready: () => Promise<void>; quads: () => Quads | undefined }>({
  duration: SEQUENCE.filmMs,
  seek: (ms) => scene?.seek(ms),
  ready: async () => {
    await created;
    await scene?.ready();
  },
  quads: () => scene?.quads(),
});
</script>

<template>
  <canvas ref="canvas" class="scene" />
</template>

<style scoped>
.scene {
  @apply fixed inset-0 block h-screen w-screen;
}
</style>
