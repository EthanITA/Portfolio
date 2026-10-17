<script setup lang="ts">
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import type { ExtrudeGeometry } from "three";
import { createIsland, createLine, createStage, ISLAND, slab, STAGE_CAMERA, type Island, type Stage, type VioletLine } from "~/utils/stage/island";
import type { IslandShot } from "~~/films/scripts/script";

const { shots } = defineProps<{ shots: IslandShot[] }>();

const OPEN = { width: 2.9, height: 1.04 } as const;
const FADE = 600;
const DRAW = 600;

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const { timeline, onFrame } = useFilmContext();

let stage: Stage | undefined;
let island: Island | undefined;
let line: VioletLine | undefined;
let opened = 0;

const progress = ({ ms, start, length, ease }: { ms: number; start: number; length: number; ease: (t: number) => number }): number =>
  ease(Math.min(1, Math.max(0, (ms - start) / length)));

const reshape = (open: number): void => {
  if (!island || open === opened) return;
  opened = open;
  const width = ISLAND.width + (OPEN.width - ISLAND.width) * open;
  const height = ISLAND.height + (OPEN.height - ISLAND.height) * open;
  const swap = (mesh: { geometry: ExtrudeGeometry }, scale: number): void => {
    mesh.geometry.dispose();
    mesh.geometry = slab({ width: width * scale, height: height * scale, depth: ISLAND.depth * scale, radius: ISLAND.radius * scale });
  };
  swap(island.glass, 1);
  swap(island.core, ISLAND.core);
  for (const child of island.group.children) if (child !== island.body) child.position.y = -height / 2 - ISLAND.lineGap;
};

onMounted(() => {
  if (!canvas.value) return;
  stage = createStage({ canvas: canvas.value, camera: STAGE_CAMERA.hero, film: true });
  stage.resize(canvas.value.clientWidth, canvas.value.clientHeight);
  island = createIsland(stage);
  line = createLine(stage, { length: ISLAND.width });
  line.group.position.y = -0.45;
  stage.scene.add(island.group, line.group);
  for (const shot of shots) {
    timeline.add(canvas.value, { opacity: [0, 1], duration: FADE, ease: MOTION_EASE.inOut }, shot.at);
    if (shot.until) timeline.add(canvas.value, { opacity: [1, 0], duration: FADE, ease: MOTION_EASE.inOut }, shot.until);
  }
});

onFrame((ms) => {
  if (!stage || !island || !line) return;
  const shot = shots.findLast((candidate) => candidate.at <= ms);
  island.group.visible = shot?.shape === "island";
  line.group.visible = shot?.shape === "line";
  if (shot) {
    const draw = shot.draw ? progress({ ms, start: shot.draw, length: DRAW, ease: MOTION_EASE.out }) : 1;
    island.group.position.y = shot.y ?? 0;
    island.pose({ ms, draw });
    line.set({ draw });
    reshape(shot.open ? progress({ ms, start: shot.open, length: MOTION_DURATION.slow, ease: MOTION_EASE.inOut }) : 0);
  }
  stage.render();
});

onBeforeUnmount(() => stage?.dispose());
</script>

<template>
  <canvas ref="canvas" class="film-island" />
</template>

<style scoped>
.film-island {
  @apply absolute inset-0 size-full opacity-0;
}
</style>
