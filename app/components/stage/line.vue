<script lang="ts">
// Outside setup so the first touch silences autoplay for the whole page session, across route changes.
let quiet = false;
</script>

<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { Status, Tier } from "~/utils/stage/line";
import type { SceneSetup } from "~/utils/stage/scene";

import { Chip, Kbd, TextInput } from "@cela/design";
import { pulse } from "@cela/design/utils/motion";

import { STAGE_CAMERA, hydrationSafe, toScreen } from "~/utils/stage/camera";
import { LINE, TIERS, createLedger, pose, settling } from "~/utils/stage/line";
import { useScene } from "~/utils/stage/scene";

const { mode = "live" } = defineProps<{ mode?: SceneMode }>();

const EXAMPLES = ["find the biggest files", "delete the dist folder", "pay the invoice", "join the standup", "force push to main"];
const TIER_NAME: Record<Tier, string> = { runs: "Runs", waits: "Waits for you", stops: "Stops at the line" };
const PLACEHOLDER = "Type something you'd ask an agent to do";
const PRESS = "Press it yourself";
const ZONE: Record<Tier, number> = { runs: -2.2, waits: 0.9, stops: 0 };
const FILM = {
  events: [
    ...EXAMPLES.slice(0, 4).map((text, i) => ({ at: i * LINE.every, send: text })),
    { at: 9800, release: true },
    { at: 4 * LINE.every, send: EXAMPLES[4] ?? "" },
    { at: 12600, press: "pay the invoice" },
  ],
  duration: 16000,
  rest: 8000,
} as const;

type View = { id: number; text: string; tier: Tier; status: Status };

const film = mode === "film";
const root = useTemplateRef<HTMLElement>("root");
const box = useTemplateRef<HTMLElement>("box");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const text = ref("");
const views = shallowRef<View[]>([]);
const announcement = ref("");
const ZONE_TOP: Record<Tier, { "--top": number }> = {
  runs: { "--top": hydrationSafe(toScreen(STAGE_CAMERA.line, [0, 0, ZONE.runs]).top) },
  waits: { "--top": hydrationSafe(toScreen(STAGE_CAMERA.line, [0, 0, ZONE.waits]).top) },
  stops: { "--top": hydrationSafe(toScreen(STAGE_CAMERA.line, [0, 0, ZONE.stops]).top) },
};

const overlays = new Map<number, HTMLElement>();
const rects = new Map<number, [number, number, number, number]>();
const sizes = new WeakMap<HTMLElement, string>();
const ledger = createLedger(() => reduced.value);
const auto = { next: 0, index: 0 };
let slots = 4;
let refresh: () => void = () => {};

const bind = (id: number, el: unknown): void => {
  if (el instanceof HTMLElement) overlays.set(id, el);
  else overlays.delete(id);
};

const place = (): void => {
  rects.forEach(([x, y, width, height], id) => {
    const el = overlays.get(id);
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.dataset.placed = "";
    const size = `${Math.round(width)}x${Math.round(height)}`;
    if (sizes.get(el) === size) return;
    sizes.set(el, size);
    el.style.width = `${Math.round(width)}px`;
    el.style.height = `${Math.round(height)}px`;
  });
};

const setup: SceneSetup = async ({ canvas: surface, film: filming, mobile }) => {
  const [{ createLine, openStage, readPalette }, { createChip }, { BufferGeometry, Float32BufferAttribute, LineSegments, Vector3 }] = await Promise.all([
    import("~/utils/stage/island"),
    import("~/utils/stage/chip"),
    import("three"),
  ]);
  await document.fonts.load(`500 32px ${getComputedStyle(document.documentElement).getPropertyValue("--mono")}`);

  const stage = await openStage({ canvas: surface, camera: STAGE_CAMERA.line, film: filming, mobile, fog: [10, 18] });
  const wide = matchMedia("(min-width: 768px)");

  const rows: number[] = [];
  for (let z = 5; z >= -12; z--) if (z) rows.push(-14, 0, z, 14, 0, z);
  const grid = new LineSegments(new BufferGeometry().setAttribute("position", new Float32BufferAttribute(rows, 3)), stage.material("grid"));
  const line = createLine(stage, { length: 30, thickness: 0.05 });
  line.group.rotation.x = -Math.PI / 2;
  line.group.position.y = 0.004;
  stage.scene.add(grid, line.group);

  const chips = new Map<number, ReturnType<typeof createChip>>();
  const highlights = new Map<number, ReturnType<typeof createLine>>();
  const layout = { slotX: [0], slotWidth: 1.6, size: 0.09, width: 1, height: 1 };

  const resize = (width: number, height: number): void => {
    stage.resize(width, height);
    if (!width || !height) return;
    const origin = new Vector3(0, 0, 0).project(stage.camera);
    const unit = new Vector3(1, 0, 0).project(stage.camera).x - origin.x;
    const perUnit = (unit * width) / 2;
    const left = (-1 - origin.x) / unit;
    const right = (1 - origin.x) / unit;
    const gutter = (Math.max(0, ...[...(box.value?.querySelectorAll<HTMLElement>("[data-zone]") ?? [])].map((el) => el.offsetLeft + el.offsetWidth)) + 16) / perUnit;
    slots = wide.matches ? 4 : 2;
    const start = left + gutter;
    const span = right - 0.15 - start;
    layout.slotWidth = span / slots;
    layout.slotX = Array.from({ length: slots }, (_, i) => start + layout.slotWidth * (i + 0.5));
    layout.size = (wide.matches ? 17 : 14) / perUnit;
    layout.width = width;
    layout.height = height;
  };

  const point = new Vector3();
  const project = (x: number, y: number, z: number): [number, number] => {
    point.set(x, y, z).project(stage.camera);
    return [((point.x + 1) / 2) * layout.width, ((1 - point.y) / 2) * layout.height];
  };

  const frame = (ms: number, dt: number): boolean => {
    stage.advance(dt);
    const calm = reduced.value && !filming;

    if (!filming && !calm && !quiet) {
      while (ms >= auto.next) {
        const example = EXAMPLES[auto.index++ % EXAMPLES.length] ?? "";
        ledger.send(example, auto.next, slots);
        auto.next += LINE.every;
      }
    }

    const seen = new Set<number>();
    const next: View[] = [];
    for (const action of ledger.actions) {
      const p = pose(action, ms, calm);
      if (p.status === "gone") continue;
      seen.add(action.id);
      let chip = chips.get(action.id);
      if (!chip) {
        chip = createChip(stage, { text: action.text, size: layout.size, maxWidth: layout.slotWidth - 0.12 });
        stage.scene.add(chip.group);
        chips.set(action.id, chip);
      }
      const x = layout.slotX[action.slot] ?? 0;
      const y = chip.height / 2 + 0.06;
      chip.group.position.set(x, y, p.z);
      chip.set({ opacity: p.opacity, tint: p.tint, check: p.check, outline: p.outline, glass: stage.palette.glass, success: stage.palette.success });

      if (action.tier === "stops") {
        let glow = highlights.get(action.id);
        if (!glow) {
          glow = createLine(stage, { length: chip.width + 0.3, thickness: 0.12 });
          glow.group.rotation.x = -Math.PI / 2;
          glow.group.position.set(x, 0.006, 0);
          stage.scene.add(glow.group);
          highlights.set(action.id, glow);
        }
        glow.set({ opacity: p.glow * p.opacity, intensity: 2 + 2 * p.glow, draw: p.glow > 0.001 ? 1 : 0 });
      }

      const [left, top] = project(x - chip.width / 2, y + chip.height / 2, p.z);
      const [right, bottom] = project(x + chip.width / 2, y - chip.height / 2, p.z);
      rects.set(action.id, [left, top, right - left, bottom - top]);
      next.push({ id: action.id, text: action.text, tier: action.tier, status: p.status });
    }

    chips.forEach((chip, id) => {
      if (seen.has(id)) return;
      chip.dispose();
      chips.delete(id);
      highlights.get(id)?.dispose();
      highlights.delete(id);
      rects.delete(id);
    });
    if (!filming) ledger.prune(ms);

    const key = (list: View[]): string => list.map((view) => `${view.id}${view.status}`).join();
    if (key(next) !== key(views.value)) {
      views.value = next;
      void nextTick(place);
    }
    place();
    stage.render();
    return !calm || ledger.actions.some((action) => settling(action, ms));
  };

  refresh = () => frame(clock(), 0);

  await stage.warm();
  return {
    frame,
    theme: (instant) => stage.setPalette(readPalette(), instant),
    resize,
    dispose: () => {
      chips.forEach((chip) => chip.dispose());
      highlights.forEach((glow) => glow.dispose());
      grid.geometry.dispose();
      stage.dispose();
    },
  };
};

const { state, theme, reduced, clock, kick, seekable } = useScene({
  mode,
  duration: FILM.duration,
  root: () => root.value ?? undefined,
  box: () => box.value ?? undefined,
  canvas: () => canvas.value ?? undefined,
  setup,
  reducedOnDemand: true,
  start: film ? 0 : FILM.rest,
});

// Live opens on the film's rest frame, which is what the poster shows, so the canvas fades in over the same stage.
const seed = (count: number): void => {
  slots = count;
  ledger.actions.length = 0;
  Object.assign(auto, { next: 0, index: 0 });
  const until = film ? Infinity : FILM.rest;
  FILM.events.forEach((event) => {
    if (event.at > until) return;
    if ("send" in event) {
      ledger.send(event.send, event.at, count);
      auto.index++;
      auto.next = event.at + LINE.every;
    } else if ("release" in event) ledger.release(event.at);
    else {
      const target = ledger.actions.find((action) => action.text === event.press);
      if (target) ledger.press(event.at, target.id);
    }
  });
  const at = film ? 0 : FILM.rest;
  views.value = ledger.actions.flatMap((action) => {
    const { status } = pose(action, at);
    return status === "gone" ? [] : [{ id: action.id, text: action.text, tier: action.tier, status }];
  });
};

seed(4);
onMounted(() => {
  if (!matchMedia("(min-width: 768px)").matches) seed(2);
});

const interact = (): void => {
  quiet = true;
};

const announce = (tier: Tier, ask: string): void => {
  announcement.value = `${ask} · ${TIER_NAME[tier]}`;
};

const send = async (ask: string): Promise<void> => {
  await kick();
  const action = ledger.send(ask, clock(), slots);
  if (action) announce(action.tier, action.text);
  refresh();
};

const submit = (): void => {
  interact();
  const ask = text.value.trim();
  if (ask) {
    text.value = "";
    void send(ask);
    return;
  }
  if (ledger.release(clock())) refresh();
};

const choose = (example: string): void => {
  interact();
  void send(example);
  root.value?.querySelector("input")?.focus();
};

const release = (id: number): void => {
  if (ledger.release(clock(), id)) refresh();
};

const press = (id: number): void => {
  if (ledger.press(clock(), id)) refresh();
};

watch(views, (next, previous) => {
  if (film || reduced.value) return;
  const waiting = new Set(previous.filter((view) => view.status === "waiting").map((view) => view.id));
  const fresh = next.filter((view) => view.status === "waiting" && !waiting.has(view.id));
  if (!fresh.length) return;
  void nextTick(() => fresh.forEach((view) => {
    const keycap = overlays.get(view.id)?.querySelector<HTMLElement>(".keycap");
    if (keycap) pulse(keycap);
  }));
});

defineExpose({ ...seekable, restMs: FILM.rest });
</script>

<template>
  <div ref="root" class="line" data-scene="line" :data-mode="mode" :data-state="state" :data-theme-applied="theme" @pointerdown.capture="interact" @keydown.capture="interact">
    <form v-if="!film" class="ask" @submit.prevent="submit">
      <TextInput v-model="text" class="input" :placeholder="PLACEHOLDER" :aria-label="PLACEHOLDER" maxlength="60" enterkeyhint="send" />
      <div class="examples">
        <Chip v-for="example in EXAMPLES" :key="example" @click="choose(example)">{{ example }}</Chip>
      </div>
    </form>
    <div ref="box" class="stage">
      <StagePoster v-if="!film" name="line" :theme="theme" />
      <canvas ref="canvas" class="canvas" />
      <span v-for="tier in TIERS" :key="tier" class="zone" :data-zone="tier" :style="ZONE_TOP[tier]">{{ TIER_NAME[tier] }}</span>
      <div v-for="view in views" :key="view.id" :ref="(el: unknown) => bind(view.id, el)" class="action" :data-action="view.id" :data-tier="view.tier" :data-status="view.status">
        <template v-if="view.status === 'waiting'">
          <button type="button" class="release" :aria-label="`${view.text} · ${TIER_NAME.waits}`" @click="release(view.id)" />
          <Kbd class="keycap" keys="enter" />
        </template>
        <button v-else-if="view.status === 'stopped'" type="button" class="press" @click="press(view.id)">{{ PRESS }}</button>
      </div>
    </div>
    <p v-if="!film" class="announce" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.line {
  @apply flex size-full flex-col gap-4;
}

.ask {
  @apply flex flex-col gap-3;
}

/* TextInput's outline-none leaves --tw-outline-style at none, and @cela/design's focus-ring reads it, so the ring never draws. */
.input:focus-visible {
  @apply outline-solid;
}

.examples {
  @apply flex flex-wrap gap-2;
}

.stage {
  @apply @container-size relative min-h-0 flex-1 overflow-hidden rounded-box bg-canvas;
}

.canvas {
  @apply absolute inset-0 size-full opacity-0;
}

.zone {
  @apply typo-eyebrow pointer-events-none absolute left-4 -translate-y-1/2 text-muted;
  /* The canvas crops like a 16:9 cover poster, so one frame height is the larger of the box height and its width over 16:9. */
  top: calc(50% + (var(--top) - 0.5) * max(100cqh, 56.25cqw));
}

.zone[data-zone="stops"] {
  @apply text-primary;
}

/* Posters are rendered in film mode; the live labels sit over them, so the film keeps their space but not their ink. */
.line[data-mode="film"] .zone {
  @apply invisible;
}

/* The rest frame's controls prerender for their copy and stay hidden until the scene has placed them over their chips. */
.action {
  @apply pointer-events-none invisible absolute top-0 left-0;

  &[data-placed] {
    @apply visible;
  }
}

.release {
  @apply pointer-events-auto absolute inset-0 cursor-pointer rounded-full;

  &:focus-visible {
    @apply focus-ring;
  }
}

.keycap {
  @apply pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2;
}

.press {
  @apply typo-meta-strong pointer-events-auto absolute bottom-full left-1/2 mb-2 -translate-x-1/2 cursor-pointer rounded-full border border-primary bg-raised px-3 py-1 whitespace-nowrap text-primary;

  &:focus-visible {
    @apply focus-ring;
  }
}

.announce {
  @apply sr-only;
}
</style>
