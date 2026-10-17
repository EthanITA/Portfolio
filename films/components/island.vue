<script setup lang="ts">
import { Mesh, MeshBasicMaterial, Vector3, type Color, type ExtrudeGeometry } from "three";
import { createIsland, createStage, ISLAND, slab, type Island, type Stage } from "~/utils/stage/island";
import { FRAME, type FilmScript } from "~~/films/scripts/script";
import { IslandMotion, type Box, type IslandState } from "~~/films/utils/island";

const { script } = defineProps<{ script: FilmScript }>();
const emit = defineEmits<{ radius: [px: number] }>();

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const { onFrame, cut } = useFilmContext();
const times = IslandMotion.times(script);

type Outline = { left: number; top: number; right: number; bottom: number; radius: number };

let stage: Stage | undefined;
let island: Island | undefined;
let core: Mesh<ExtrudeGeometry, MeshBasicMaterial> | undefined;
let ink: Color | undefined;
let shaped = "";
let outline: Outline | undefined;

const project = (mesh: Mesh): Outline => {
  if (!stage) throw new Error("the island has no stage");
  mesh.updateWorldMatrix(true, false);
  stage.camera.updateMatrixWorld();
  const position = mesh.geometry.getAttribute("position");
  const point = new Vector3();
  const xs: number[] = [];
  const ys: number[] = [];
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld).project(stage.camera);
    xs.push(((point.x + 1) / 2) * FRAME[cut].width);
    ys.push(((1 - point.y) / 2) * FRAME[cut].height);
  }
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  // A circular corner of radius r comes closest to its rect's corner on the diagonal, at r(2 - √2) in summed distance.
  const corner = Math.min(...xs.map((x, index) => x - left + (ys[index] ?? 0) - top));
  return { left, top, right: Math.max(...xs), bottom: Math.max(...ys), radius: corner / (2 - Math.SQRT2) };
};

const swap = (mesh: { geometry: ExtrudeGeometry }, geometry: ExtrudeGeometry): void => {
  mesh.geometry.dispose();
  mesh.geometry = geometry;
};

const build = ({ box, depth, x, y }: { box: Box; depth: number; x: number; y: number }): Outline => {
  if (!island || !core) throw new Error("the island is not built");
  const k = IslandMotion.scale({ cut, depth });
  swap(island.glass, slab({ width: box.width * k, height: box.height * k, depth, radius: box.radius * k }));
  swap(core, slab({ width: box.width * k * ISLAND.core, height: box.height * k * ISLAND.core, depth: depth * ISLAND.core, radius: box.radius * k * ISLAND.core }));
  island.group.position.set(x, y, 0);
  return project(island.glass);
};

// The bevel's curve bulges past the side walls in perspective, so the slab is measured once and corrected onto its box.
const shape = ({ box, depth }: IslandState): Outline | undefined => {
  const key = [box.x, box.y, box.width, box.height, box.radius, depth].join(" ");
  if (key === shaped || !island) return outline;
  // The breath scales the body after the fit, so a slab fitted mid-breath would differ with the order frames are seeked in.
  island.body.scale.setScalar(1);
  const k = IslandMotion.scale({ cut, depth });
  const x = (box.x - FRAME[cut].width / 2) * k;
  const y = (FRAME[cut].height / 2 - box.y) * k;
  const first = build({ box, depth, x, y });
  const stretch = box.width / (first.right - first.left);
  const corrected = { ...box, width: box.width * stretch, height: (box.height * box.height) / (first.bottom - first.top), radius: box.radius * stretch };
  shaped = key;
  outline = build({ box: corrected, depth, x: x + (box.x - (first.left + first.right) / 2) * k, y: y - (box.y - (first.top + first.bottom) / 2) * k });
  return outline;
};

onMounted(() => {
  if (!canvas.value) return;
  stage = createStage({ canvas: canvas.value, camera: IslandMotion.camera(cut), film: true });
  stage.resize(canvas.value.clientWidth, canvas.value.clientHeight);
  island = createIsland(stage);
  ink = island.core.material.color.clone();
  core = new Mesh(island.core.geometry.clone(), new MeshBasicMaterial({ color: ink, toneMapped: false }));
  island.core.visible = false;
  island.body.add(core);
  stage.scene.add(island.group);
  const open = shape(IslandMotion.pose({ ms: times.open, cut, times }));
  if (open) emit("radius", open.radius);
});

onFrame((ms) => {
  if (!stage || !island || !core || !ink || !canvas.value) return;
  const state = IslandMotion.pose({ ms, cut, times });
  canvas.value.style.opacity = String(state.opacity);
  // Transmission makes every SwiftShader frame expensive, and a canvas faded to nothing shows none of it.
  if (!state.opacity) return;
  const fitted = shape(state);
  if (fitted) canvas.value.dataset.box = [fitted.left, fitted.top, fitted.right, fitted.bottom, fitted.radius].map((value) => value.toFixed(2)).join(" ");
  island.pose({ ms, draw: state.line, breathe: state.breathe });
  // The core blends to the canvas it is seen against, since a transparent core would vanish behind the glass's depth.
  core.material.color.lerpColors(stage.palette.canvas, ink, state.core);
  core.visible = state.core > 0;
  stage.render();
});

onBeforeUnmount(() => {
  core?.material.dispose();
  stage?.dispose();
});
</script>

<template>
  <canvas ref="canvas" class="film-island" />
</template>

<style scoped>
.film-island {
  @apply absolute inset-0 size-full;
}
</style>
