<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { Spring } from "animejs";
import type { CameraPreset, Vec3 } from "~/utils/stage/camera";
import type { SceneSetup } from "~/utils/stage/scene";

import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { createAnimatable, spring } from "animejs";
import { useScene } from "~/utils/stage/scene";

const { mode = "live", progress = 0, lost = false } = defineProps<{ mode?: SceneMode; progress?: number; lost?: boolean }>();

const ENTER = { fadeAt: 150, fadeFor: MOTION_DURATION.slow, drawAt: 500, drawFor: 600 } as const;
const REST_MS = ENTER.drawAt + ENTER.drawFor;
const TILT = (6 * Math.PI) / 180;
const PARALLAX = (2 * Math.PI) / 180;
const DRIFT = { angle: (1.5 * Math.PI) / 180, period: 8000 } as const;
const SETTLE_FROM = 0.8;

const root = useTemplateRef<HTMLElement>("root");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const sineInOut = (t: number): number => 0.5 - Math.cos(Math.PI * t) / 2;
const window01 = (ms: number, at: number, length: number): number => clamp01((ms - at) / length);
const mix = (a: Vec3, b: Vec3, t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const restAt = (hero: CameraPreset, { distance, right, up }: { distance: number; right: number; up: number }): CameraPreset => {
  const height = 2 * distance * Math.tan((hero.fov * Math.PI) / 360);
  const slope = (hero.position[1] - hero.target[1]) / (hero.position[2] - hero.target[2]);
  const target: Vec3 = [-right * height, hero.target[1] - up * height, 0];
  return { fov: hero.fov, position: [target[0], target[1] + distance * slope, distance], target };
};

// Fixed rather than measured from the layout, so one poster matches the first frame on every phone under cover framing.
const REST = { wide: { distance: 9, right: 16 / 27, up: 0 }, narrow: { distance: 12, right: 0, up: 0.257 } } as const;
// On phones the copy scrolls up through the island's rest spot, so the island rides out ahead and re-forms in the hero pose behind it.
const RIDE = { speed: 1.5, until: 0.3, from: 0.45, to: 0.7 } as const;

const setup: SceneSetup = async ({ canvas: surface, film, mobile }) => {
  const { createIsland, openStage, readPalette, STAGE_CAMERA } = await import("~/utils/stage/island");
  const stage = await openStage({ canvas: surface, camera: STAGE_CAMERA.hero, film, mobile });
  const island = createIsland(stage);
  stage.scene.add(island.group);
  await stage.warm();

  const hero = STAGE_CAMERA.hero;
  const rest = restAt(hero, REST.wide);
  const wide = matchMedia("(min-width: 768px)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");

  // MOTION_SPRING goes through animejs's deprecated createSpring, which warns on every call; these are its gentle and snappy values.
  const gentle = spring({ mass: 1, stiffness: 100, damping: 15 });
  const snappy = spring({ mass: 1, stiffness: 250, damping: 20 });
  const tilt = { x: 0, y: 0 };
  const follow = film ? undefined : createAnimatable(tilt, { x: { ease: gentle }, y: { ease: gentle } });
  const aim = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0, over: false };

  const steer = (x: number, y: number, ease: Spring): void => {
    if (Math.abs(x - aim.x) < 0.002 && Math.abs(y - aim.y) < 0.002) return;
    aim.x = x;
    aim.y = y;
    follow?.x?.(x, ease.settlingDuration, ease);
    follow?.y?.(y, ease.settlingDuration, ease);
  };

  // The canvas sits in a pinned holder under the hero copy, so the window hears the pointer and the box is cached, never read per event.
  const onMove = (event: PointerEvent): void => {
    pointer.over = event.pointerType === "mouse";
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const onOut = (event: PointerEvent): void => {
    if (!event.relatedTarget) pointer.over = false;
  };
  let box: DOMRect | undefined;
  let measuredAt = -Infinity;
  const remeasure = (): void => {
    box = undefined;
  };
  if (follow) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("scroll", remeasure, { passive: true });
    window.addEventListener("resize", remeasure);
  }

  const track = (ms: number): void => {
    if (!pointer.over || !fine.matches) return steer(0, 0, snappy);
    // Scroll and resize clear the box at once; the refresh catches a holder transform, like web's entrance, that neither reports.
    if (!box || ms - measuredAt > 500) {
      box = root.value?.getBoundingClientRect();
      measuredAt = ms;
    }
    if (!box) return steer(0, 0, snappy);
    const x = ((pointer.x - box.left) / box.width) * 2 - 1;
    const y = 1 - ((pointer.y - box.top) / box.height) * 2;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) return steer(0, 0, snappy);
    steer(x, y, gentle);
  };

  const pose = (): Pick<CameraPreset, "position" | "target"> => {
    if (lost) return hero;
    const glide = sineInOut(clamp01(progress));
    if (wide.matches) return { position: mix(rest.position, hero.position, glide), target: mix(rest.target, hero.target, glide) };
    return progress < RIDE.until ? restAt(hero, { ...REST.narrow, up: REST.narrow.up + RIDE.speed * progress }) : hero;
  };

  const frame = (ms: number, dt: number): boolean => {
    const lerping = stage.advance(dt);
    if (follow) track(ms);
    const { position, target } = pose();
    const reforming = !lost && !wide.matches && progress >= RIDE.until;
    const shown = reforming ? MOTION_EASE.out(window01(progress, RIDE.from, RIDE.to - RIDE.from)) : 1;
    // Breath and tilt fade out at the end of the glide so the handoff lands on the sequence's still frame 0.
    const calm = lost ? 1 : 1 - clamp01((progress - SETTLE_FROM) / (1 - SETTLE_FROM));

    const drifting = !film && !fine.matches;
    const phase = (2 * Math.PI * ms) / DRIFT.period;
    const tx = (drifting ? (Math.sin(phase) * DRIFT.angle) / TILT : tilt.x) * calm;
    const ty = (drifting ? (Math.sin(phase * 0.5) * DRIFT.angle * 0.5) / TILT : tilt.y) * calm;

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
        breathe: calm,
      });
    } else {
      if (root.value && root.value.style.opacity !== String(shown)) root.value.style.opacity = String(shown);
      // Not pose's scale, which only reaches the pill; the line and its glow re-form with it as one object.
      island.group.scale.setScalar(0.95 + 0.05 * shown);
      island.pose({ ms, broken: lost, breathe: calm });
    }

    stage.render();
    // From progress 1 calm is 0, so the frame stops changing and the sequence covers it; rendering it again is waste.
    return lost || progress < 1 || lerping;
  };

  return {
    frame,
    theme: (instant) => stage.setPalette(readPalette(), instant),
    resize: stage.resize,
    dispose: () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("scroll", remeasure);
      window.removeEventListener("resize", remeasure);
      follow?.revert();
      stage.dispose();
    },
  };
};

const { state, theme, wake, seekable } = useScene({
  mode,
  duration: REST_MS + MOTION_DURATION.breathe,
  root: () => root.value ?? undefined,
  canvas: () => canvas.value ?? undefined,
  setup,
});

watch(() => progress, wake);

defineExpose({ ...seekable, restMs: REST_MS });
</script>

<template>
  <div ref="root" class="hero" data-scene="hero" :data-state="state" :data-theme-applied="theme" :data-lost="lost">
    <StagePoster v-if="mode === 'live'" :name="lost ? 'lost' : 'hero'" :theme="theme" eager />
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
