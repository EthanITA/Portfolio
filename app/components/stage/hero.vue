<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { Spring } from "animejs";
import type { CameraPreset, Vec3 } from "~/utils/stage/island";
import type { SceneSetup } from "~/utils/stage/scene";

import { MOTION_DURATION, MOTION_EASE, MOTION_SPRING } from "@cela/design/utils/motion";
import { createAnimatable } from "animejs";
import { useScene } from "~/utils/stage/scene";

const { mode = "live", progress = 0, lost = false } = defineProps<{ mode?: SceneMode; progress?: number; lost?: boolean }>();

const ENTER = { fadeAt: 150, fadeFor: MOTION_DURATION.slow, drawAt: 500, drawFor: 600 } as const;
const REST_MS = ENTER.drawAt + ENTER.drawFor;
const TILT = (6 * Math.PI) / 180;
const PARALLAX = (2 * Math.PI) / 180;
const DRIFT = { angle: (1.5 * Math.PI) / 180, period: 8000 } as const;

const root = useTemplateRef<HTMLElement>("root");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const sineInOut = (t: number): number => 0.5 - Math.cos(Math.PI * t) / 2;
const window01 = (ms: number, at: number, length: number): number => clamp01((ms - at) / length);
const mix = (a: Vec3, b: Vec3, t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// The island sits centred on the right third of a 16:9 frame from 9 units back, then glides to the hero preset.
const restRight = (hero: CameraPreset): CameraPreset => {
  const distance = 9;
  const offset = (2 / 3) * distance * Math.tan((hero.fov * Math.PI) / 360) * (16 / 9);
  const slope = (hero.position[1] - hero.target[1]) / (hero.position[2] - hero.target[2]);
  return { fov: hero.fov, position: [-offset, hero.target[1] + distance * slope, distance], target: [-offset, hero.target[1], 0] };
};

const setup: SceneSetup = async ({ canvas: surface, film, mobile }) => {
  const { createIsland, createStage, readPalette, STAGE_CAMERA } = await import("~/utils/stage/island");
  const stage = createStage({ canvas: surface, camera: STAGE_CAMERA.hero, film, mobile });
  const island = createIsland(stage);
  stage.scene.add(island.group);

  const hero = STAGE_CAMERA.hero;
  const rest = restRight(hero);
  const wide = matchMedia("(min-width: 768px)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");

  const tilt = { x: 0, y: 0 };
  const gentle = MOTION_SPRING.gentle();
  const snappy = MOTION_SPRING.snappy();
  const follow = film ? undefined : createAnimatable(tilt, { x: { ease: gentle }, y: { ease: gentle } });
  let following = false;

  const steer = (x: number, y: number, spring: Spring): void => {
    follow?.x?.(x, spring.settlingDuration, spring);
    follow?.y?.(y, spring.settlingDuration, spring);
  };

  const release = (): void => {
    if (!following) return;
    following = false;
    steer(0, 0, snappy);
  };

  const onPointer = (event: PointerEvent): void => {
    const box = root.value?.getBoundingClientRect();
    if (!box || event.pointerType !== "mouse" || !fine.matches) return;
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = 1 - ((event.clientY - box.top) / box.height) * 2;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) return release();
    following = true;
    steer(x, y, gentle);
  };

  if (follow) {
    addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
  }

  const frame = (ms: number, dt: number): boolean => {
    stage.advance(dt);
    const glide = lost || !wide.matches ? 1 : sineInOut(clamp01(progress));
    const from = lost || !wide.matches ? hero : rest;
    const position = mix(from.position, hero.position, glide);
    const target = mix(from.target, hero.target, glide);

    const drifting = !film && !fine.matches;
    const phase = (2 * Math.PI * ms) / DRIFT.period;
    const tx = drifting ? (Math.sin(phase) * DRIFT.angle) / TILT : tilt.x;
    const ty = drifting ? (Math.sin(phase * 0.5) * DRIFT.angle * 0.5) / TILT : tilt.y;

    const yaw = PARALLAX * tx;
    const pitch = PARALLAX * ty;
    const dx = position[0] - target[0];
    const dy = position[1] - target[1];
    const dz = position[2] - target[2];
    const reach = Math.hypot(dx, dy, dz);
    stage.camera.position.set(
      target[0] + dx * Math.cos(yaw) + dz * Math.sin(yaw),
      target[1] + dy + reach * Math.sin(pitch),
      target[2] - dx * Math.sin(yaw) + dz * Math.cos(yaw),
    );
    stage.camera.lookAt(...target);

    island.group.rotation.set(-TILT * ty, TILT * tx, 0);

    if (film) {
      const fade = MOTION_EASE.out(window01(ms, ENTER.fadeAt, ENTER.fadeFor));
      if (root.value) root.value.style.opacity = String(fade);
      island.pose({
        ms: Math.max(0, ms - REST_MS),
        broken: lost,
        scale: 0.95 + 0.05 * fade,
        draw: MOTION_EASE.out(window01(ms, ENTER.drawAt, ENTER.drawFor)),
      });
    } else island.pose({ ms, broken: lost });

    stage.render();
    return true;
  };

  return {
    frame,
    theme: (instant) => stage.setPalette(readPalette(), instant),
    resize: stage.resize,
    dispose: () => {
      removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", release);
      follow?.revert();
      stage.dispose();
    },
  };
};

const { state, theme, seekable } = useScene({
  mode,
  duration: REST_MS + MOTION_DURATION.breathe,
  root: () => root.value ?? undefined,
  canvas: () => canvas.value ?? undefined,
  setup,
});

defineExpose({ ...seekable, restMs: REST_MS });
</script>

<template>
  <div ref="root" class="hero" data-scene="hero" :data-state="state" :data-theme-applied="theme" :data-lost="lost">
    <StagePoster v-if="mode === 'live'" :name="lost ? 'lost' : 'hero'" eager />
    <canvas ref="canvas" class="canvas" />
  </div>
</template>

<style scoped>
.hero {
  @apply relative size-full overflow-hidden bg-canvas;
}

.canvas {
  @apply absolute inset-0 size-full opacity-0;
}
</style>
