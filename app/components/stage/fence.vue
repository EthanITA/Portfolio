<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { Status } from "~/utils/stage/fence";
import type { SceneSetup } from "~/utils/stage/scene";

import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { STAGE_CAMERA, hydrationSafe, toScreen } from "~/utils/stage/camera";
import { CYCLE, FENCE, REST_MS, gateX, inFlight, pose, spec } from "~/utils/stage/fence";
import { useScene } from "~/utils/stage/scene";

const { mode = "live", light = 0 } = defineProps<{ mode?: SceneMode; light?: number }>();
const emit = defineEmits<{ gate: [n: number] }>();

const GATE = { height: 0.9, depth: 0.5, width: 0.06, reach: 0.32 } as const;
const FRONT = GATE.depth / 2;
const FOLLOW = { ms: MOTION_DURATION.slow, margin: 0.4 } as const;
// Gate 8 peaks at 400 ms, inside the 420 ms the heading's four words take to land.
const RIPPLE = { step: 40, rise: 120, fall: MOTION_DURATION.base } as const;

const SPOTS = Array.from({ length: FENCE.gates }, (_, i) => {
  const n = i + 1;
  const left = toScreen(STAGE_CAMERA.fence, [gateX(n) - GATE.reach, GATE.height, FRONT]);
  const right = toScreen(STAGE_CAMERA.fence, [gateX(n) + GATE.reach, 0, FRONT]);
  return {
    n,
    style: {
      "--left": hydrationSafe(left.side),
      "--top": hydrationSafe(left.top),
      "--width": hydrationSafe(right.side - left.side),
      "--height": hydrationSafe(right.top - left.top),
    },
  };
});

type View = { k: number; path: string; status: Status };

const film = mode === "film";
const root = useTemplateRef<HTMLElement>("root");
const gates = useTemplateRef<HTMLElement>("gates");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const views = shallowRef<View[]>([]);

const clicks = new Map<number, number>();
const emitted = new Set<number>();
let spotlit = 0;
const spotlight = (n: number): void => {
  spotlit = n;
  emit("gate", n);
};
const overlays = new Map<number, HTMLElement>();
const rects = new Map<number, [number, number, number, number]>();
const sizes = new WeakMap<HTMLElement, string>();

let rippleAt = Infinity;
const ripple = (at: number): void => {
  if (!film && !reduced.value) rippleAt = at;
};

const bind = (k: number, el: unknown): void => {
  if (el instanceof HTMLElement) overlays.set(k, el);
  else overlays.delete(k);
};

const place = (): void => {
  rects.forEach(([x, y, width, height], k) => {
    const el = overlays.get(k);
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const size = `${Math.round(width)}x${Math.round(height)}`;
    if (sizes.get(el) === size) return;
    sizes.set(el, size);
    el.style.width = `${Math.round(width)}px`;
    el.style.height = `${Math.round(height)}px`;
  });
};

const setup: SceneSetup = async ({ canvas: surface, film: filming, mobile }) => {
  const [{ createLine, openStage, readPalette, slab }, { createChip }, { Mesh, PlaneGeometry, Vector3 }] = await Promise.all([
    import("~/utils/stage/island"),
    import("~/utils/stage/chip"),
    import("three"),
  ]);
  await document.fonts.load(`500 32px ${getComputedStyle(document.documentElement).getPropertyValue("--mono")}`);

  const preset = STAGE_CAMERA.fence;
  const stage = await openStage({ canvas: surface, camera: preset, film: filming, mobile });

  const line = createLine(stage, { length: 16, thickness: 0.03 });
  stage.scene.add(line.group);

  const posts = SPOTS.map(({ n }) => {
    const glass = new Mesh(slab({ width: GATE.width, height: GATE.height, depth: GATE.depth, radius: 0.03 }), stage.material("glass"));
    glass.position.set(gateX(n), GATE.height / 2, 0);
    const core = new Mesh(new PlaneGeometry(0.025, GATE.height - 0.04), stage.material("line"));
    core.position.set(gateX(n), GATE.height / 2, FRONT + 0.01);
    stage.scene.add(glass, core);
    return { glass, core };
  });

  const chips = new Map<number, ReturnType<typeof createChip>>();
  const view = { width: 1, height: 1 };
  const unit = toScreen(preset, [1, 0, FRONT]).side - toScreen(preset, [0, 0, FRONT]).side;

  const point = new Vector3();
  const project = (x: number, y: number, z: number): [number, number] => {
    point.set(x, y, z).project(stage.camera);
    return [((point.x + 1) / 2) * view.width, ((1 - point.y) / 2) * view.height];
  };

  const levels = SPOTS.map(() => 0);
  let pan = 0;
  let followed = -1;
  let follow = { at: -Infinity, pan, levels: [...levels] };
  let liveAt = 0;

  const framePx = (): number => Math.max(view.height, (view.width * 9) / 16);
  // A box narrower than the gates crops them under cover framing, so the camera eases along the line to whichever gate the page lights.
  const panTo = (n: number): number => {
    const visible = view.width / framePx() / unit;
    const span = gateX(FENCE.gates) - gateX(1) + 2 * (GATE.reach + FOLLOW.margin);
    const reach = Math.max(0, (span - visible) / 2);
    return Math.min(reach, Math.max(-reach, gateX(n)));
  };

  const frame = (ms: number, dt: number): boolean => {
    const lerping = stage.advance(dt);
    const calm = reduced.value && !filming;
    const lighting = !filming && Number.isInteger(light) && light >= 1 && light <= FENCE.gates ? light : 0;
    // The first frame and reduced motion cut, so a restored scroll opens on its gate.
    if (lighting !== followed) {
      follow = { at: followed < 0 || calm ? -Infinity : ms, pan, levels: [...levels] };
      followed = lighting;
    }
    const k = MOTION_EASE.out(Math.min(1, (ms - follow.at) / FOLLOW.ms));
    // Unlit, the camera holds the poster's framing, so the live canvas fades in over an identical image.
    const goal = lighting ? panTo(lighting) : 0;
    pan = follow.pan + (goal - follow.pan) * k;
    stage.camera.position.set(preset.position[0] + pan, preset.position[1], preset.position[2]);
    stage.camera.lookAt(preset.target[0] + pan, preset.target[1], preset.target[2]);
    stage.camera.updateMatrixWorld();
    if (gates.value) gates.value.style.transform = `translate3d(${-pan * unit * framePx()}px, 0, 0)`;

    const now = performance.now();
    liveAt ||= now;
    // The later of the heading landing and the first live frame, so the sweep never plays under the poster or below the fold.
    const rippled = now - Math.max(rippleAt, liveAt);
    const lit = SPOTS.map(({ n }, i) => {
      const from = follow.levels[i] ?? 0;
      levels[i] = from + ((n === lighting ? 1 : 0) - from) * k;
      const t = rippled - i * RIPPLE.step;
      const wave = t < 0 || t >= RIPPLE.rise + RIPPLE.fall ? 0 : t < RIPPLE.rise ? t / RIPPLE.rise : 1 - (t - RIPPLE.rise) / RIPPLE.fall;
      return Math.max(levels[i] ?? 0, wave);
    });
    const seen = new Set<number>();
    const next: View[] = [];
    for (const k of inFlight(ms)) {
      const p = pose(k, ms, clicks.get(k));
      if (p.status === "gone") continue;
      seen.add(k);
      const { path } = spec(k);
      let chip = chips.get(k);
      if (!chip) {
        chip = createChip(stage, { text: path, size: 0.085, maxWidth: 2.4, lines: 1 });
        stage.scene.add(chip.group);
        chips.set(k, chip);
      }
      const x = p.front - chip.width / 2;
      const y = 0.18 + chip.height / 2;
      chip.group.position.set(x, y, 0);
      chip.group.rotation.y = Math.PI * p.turn;
      chip.set({ opacity: p.opacity, tint: 0, check: false, outline: p.outline, glass: stage.palette.glass, success: stage.palette.success });
      if (p.gate) lit[p.gate - 1] = Math.max(lit[p.gate - 1] ?? 0, p.lit);
      if (!filming && p.status === "stopped" && p.gate && !emitted.has(k)) {
        emitted.add(k);
        spotlight(p.gate);
      }
      const [left, top] = project(x - chip.width / 2, y + chip.height / 2, 0);
      const [right, bottom] = project(x + chip.width / 2, y - chip.height / 2, 0);
      rects.set(k, [left, top, right - left, bottom - top]);
      next.push({ k, path, status: p.status });
    }

    chips.forEach((chip, k) => {
      if (seen.has(k)) return;
      chip.dispose();
      chips.delete(k);
      rects.delete(k);
    });
    clicks.forEach((_, k) => {
      if (!seen.has(k)) clicks.delete(k);
    });
    emitted.forEach((k) => {
      if (!seen.has(k)) emitted.delete(k);
    });

    posts.forEach(({ glass, core }, i) => {
      const glow = lit[i] ?? 0;
      glass.material.color.copy(stage.palette.glass).lerp(stage.palette.primary, glow * 0.35);
      core.material.opacity = glow;
      core.material.emissiveIntensity = 2 + 2 * glow;
      core.visible = glow > 0.001;
    });

    const key = (list: View[]): string => list.map((item) => `${item.k}${item.status}`).join();
    if (key(next) !== key(views.value)) {
      views.value = next;
      void nextTick(place);
    }
    place();
    stage.render();
    return !calm || lerping;
  };

  await stage.warm();
  return {
    frame,
    theme: (instant) => stage.setPalette(readPalette(), instant),
    resize: (width, height) => {
      stage.resize(width, height);
      view.width = width;
      view.height = height;
    },
    dispose: () => {
      chips.forEach((chip) => chip.dispose());
      posts.forEach(({ glass, core }) => {
        glass.geometry.dispose();
        core.geometry.dispose();
      });
      line.dispose();
      stage.dispose();
    },
  };
};

const { state, theme, reduced, clock, kick, wake, seekable } = useScene({
  mode,
  duration: CYCLE,
  root: () => root.value ?? undefined,
  canvas: () => canvas.value ?? undefined,
  setup,
  reducedOnDemand: true,
  start: film ? 0 : REST_MS,
});

// Reduced motion parks the loop, so the scene boots at mount and each light change wakes it for one still frame.
const still = (): void => {
  if (reduced.value) void kick();
};
onMounted(still);
watch(() => light, still);

const stop = (k: number): void => {
  const now = clock();
  if (clicks.has(k) || pose(k, now).status !== "flow") return;
  clicks.set(k, now);
  wake();
};

const hover = (n: number): void => {
  if (!film && n !== spotlit) spotlight(n);
};

defineExpose({ ...seekable, restMs: REST_MS, ripple });
</script>

<template>
  <div ref="root" class="fence" data-scene="fence" :data-state="state" :data-theme-applied="theme" :data-light="light">
    <StagePoster v-if="!film" name="fence" :theme="theme" />
    <canvas ref="canvas" class="canvas" />
    <div v-if="!film" ref="gates" class="gates">
      <template v-for="spot in SPOTS" :key="spot.n">
        <span class="gate" :data-gate="spot.n" :style="spot.style" @pointerenter="hover(spot.n)">
          <span class="number">{{ spot.n }}</span>
        </span>
        <!-- A line break between inline siblings compiles to nothing, so the text twin would read "12345678". -->
        {{ " " }}
      </template>
    </div>
    <button
      v-for="item in views"
      :key="item.k"
      :ref="(el: unknown) => bind(item.k, el)"
      type="button"
      class="change"
      :data-change="item.k"
      :data-stopped="item.status !== 'flow'"
      :aria-label="item.path"
      @click="stop(item.k)"
    />
  </div>
</template>

<style scoped>
.fence {
  @apply @container-size relative size-full overflow-hidden bg-canvas;
}

.canvas {
  @apply absolute inset-0 size-full opacity-0;
}

.gates {
  @apply pointer-events-none absolute inset-0;

  /* The canvas crops like a 16:9 cover poster, so one frame height is the larger of the box height and its width over 16:9. */
  --frame: max(100cqh, 56.25cqw);
}

.gate {
  @apply pointer-events-auto absolute;
  left: calc(50% + var(--left) * var(--frame));
  top: calc(50% + (var(--top) - 0.5) * var(--frame));
  width: calc(var(--width) * var(--frame));
  height: calc(var(--height) * var(--frame));
}

.number {
  @apply typo-mono-meta pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 text-fg;
}

.change {
  @apply absolute top-0 left-0 cursor-pointer rounded-full;

  &:focus-visible {
    @apply focus-ring;
  }

  &[data-stopped="true"] {
    @apply cursor-default;
  }
}
</style>
