<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { Face, SidecarToy } from "~/utils/play/sidecar";

import { Segmented, Surface, Toast } from "@cela/design";
import { useReel } from "~/utils/play/reel";
import { BEATS } from "~/utils/play/script/beats";
import { SIDECAR_REEL, sidecarToy } from "~/utils/play/sidecar";

const { mode = "live", paused = false } = defineProps<{ mode?: SceneMode; paused?: boolean }>();

const root = useTemplateRef<HTMLElement>("root");
const visible = ref(false);
const playing = computed(() => visible.value && !paused);
let toy: SidecarToy | undefined;

const reel = useReel({
  reel: SIDECAR_REEL,
  mode,
  root,
  visible: playing,
  visitor: (state) => (toy = sidecarToy(state, { tween: (name, value, options) => reel.tween(name, value, options) })),
  beats: BEATS.sidecar.beats,
});

defineExpose({ ...reel.seekable, ...reel.control, show: reel.show });

const state = computed(() => reel.view.current);
const isVisitor = computed(() => reel.driver.value === "visitor");

const FACES: { label: string; value: Face }[] = [
  { label: "Review", value: "review" },
  { label: "Artifacts", value: "artifacts" },
];

const act = (run: (live: SidecarToy) => void): void => {
  if (mode === "film") return;
  reel.ensureVisitor();
  if (toy) run(toy);
};

const isShortcut = (event: KeyboardEvent): boolean => (event.metaKey || event.ctrlKey) && ["enter", "y", "z"].includes(event.key.toLowerCase());

const onKey = (event: KeyboardEvent): void => {
  if (mode === "film" || (!isVisitor.value && !isShortcut(event))) return;
  act((live) => live.key(event));
};

const onFace = (face: Face): void => act((live) => live.face(face));

// Closing the note removes the field that held focus, so focus goes back to the frame instead of the page.
watch(
  () => state.value.composing,
  (isOpen) => {
    if (isOpen || mode === "film") return;
    const frame = root.value?.closest<HTMLElement>("[data-driver]");
    if (frame && !frame.contains(document.activeElement)) frame.focus();
  },
  { flush: "post" },
);
</script>

<template>
  <PlayFrame
    v-model:visible="visible"
    :driver="reel.driver.value"
    invite-at="top"
    label="Sidecar"
    :mode="mode"
    @key="onKey"
    @take="reel.takeOver()"
  >
    <div ref="root" class="sidecar" :data-face="state.face" :data-mode="mode">
      <div class="panes">
        <PlaySidecarTerminal data-film-anchor="terminal" :rows="state.rows" />

        <i aria-hidden="true" class="seam" data-film-anchor="seam" />
        <!-- The motion sits on a wrapper because Surface transitions its own opacity, which would trail every seek. -->
        <div class="window" data-window>
          <Surface class="pane" pad="none" variant="raised">
            <div class="bar">
              <!-- Remounted per face in film, because Segmented tweens its highlight on its own clock and a seek must land settled. -->
              <Segmented :key="mode === 'film' ? state.face : 'live'" :model-value="state.face" :options="FACES" @update:model-value="onFace" />
            </div>
            <div class="faces">
              <PlaySidecarReview
                class="face"
                data-face="review"
                data-film-anchor="review"
                :focus="isVisitor"
                :inert="state.face !== 'review'"
                :mode="mode"
                :state="state"
                @cancel="act((live) => live.cancel())"
                @draft="(text) => act((live) => live.draft(text))"
                @hunk="(id, isAccept) => act((live) => live.hunk(id, isAccept))"
                @redo="act((live) => live.redo())"
                @save="act((live) => live.save())"
                @select="(path) => act((live) => live.select(path))"
                @under="(path, isAccept) => act((live) => live.under(path, isAccept))"
                @undo="act((live) => live.undo())"
              />
              <PlaySidecarArtifacts
                class="face"
                data-face="artifacts"
                data-film-anchor="artifacts"
                :focus="isVisitor"
                :inert="state.face !== 'artifacts'"
                :mode="mode"
                :state="state"
                @cancel="act((live) => live.cancel())"
                @draft="(text) => act((live) => live.draft(text))"
                @save="act((live) => live.save())"
                @spot="(block) => act((live) => live.spot(block))"
              />
            </div>
            <div class="dock">
              <!-- Mounted from the start, so its own enter transition is spent before any toast shows. -->
              <span class="toast" :aria-live="isVisitor ? 'polite' : 'off'" data-toast>
                <Toast :variant="state.toast?.tone ?? 'neutral'">{{ state.toast?.text }}</Toast>
              </span>
              <button v-if="state.tray.length" class="send" data-send type="button" @click="act((live) => live.send())">
                <PlaySidecarIcon name="send" />
                Send {{ state.tray.length }} {{ state.tray.length === 1 ? "note" : "notes" }} to Claude
              </button>
            </div>
          </Surface>
        </div>
      </div>

      <div
        v-if="state.flight"
        :key="state.flight.id"
        aria-hidden="true"
        class="flight"
        data-flight
        :data-kind="state.flight.kind"
        :style="{ '--fly': `var(--fly${state.flight.id}, 0)` }"
      >
        {{ state.flight.text }}
      </div>
      <PlayBeats v-if="mode === 'film'" :beats="BEATS.sidecar.beats" />
    </div>
  </PlayFrame>
</template>

<style scoped>
.sidecar {
  @apply relative size-full;
  container: sidecar / size;
  opacity: var(--loop, 1);
}

.panes {
  @apply grid size-full gap-1.5 p-4;
  grid-template-columns: minmax(0, 2fr) 1px minmax(0, 3fr);
}

/* Empty on the site; the film draws its violet line on this box during the pull-back. */
.seam {
  @apply block self-stretch;
}

.window {
  @apply @container min-h-0;
  opacity: var(--side, 1);
  translate: calc((1 - var(--side, 1)) * 24px) 0;
}

.pane {
  @apply relative flex size-full flex-col overflow-hidden;
}

.bar {
  @apply flex h-12 flex-none items-center justify-center border-b border-border;
}

.bar :deep(.segmented-option) {
  @apply hit-area;
}

.faces {
  @apply relative min-h-0 flex-1;
}

.face {
  @apply absolute inset-0;
}

.face[data-face="review"] {
  opacity: calc(1 - var(--face, 0));
  translate: calc(var(--face, 0) * -12px) 0;
}

.face[data-face="artifacts"] {
  opacity: var(--face, 0);
  translate: calc((1 - var(--face, 0)) * 12px) 0;
}

.dock {
  @apply pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-center;
}

.toast {
  @apply flex justify-center;
  opacity: var(--toast, 0);
  translate: 0 calc((1 - var(--toast, 0)) * 8px);
}

.send {
  @apply pointer-events-auto absolute right-0 bottom-0 hit-area inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border-0 bg-primary px-4 typo-caption-strong text-primary-content shadow-lg;
  opacity: var(--tray, 1);
  translate: 0 calc((1 - var(--tray, 1)) * 8px);
}

.send:focus-visible {
  @apply focus-ring;
}

/* Container units rather than measured rects, so the arc lands on the same pixels in every render. */
.flight {
  @apply pointer-events-none absolute z-30 max-w-80 truncate rounded-full bg-fg px-3 py-1.5 font-mono typo-mono-meta text-canvas shadow-lg;
  --from-x: 81cqw;
  --from-y: 44cqh;
  --to-x: 20.5cqw;
  --to-y: 94cqh;
  left: var(--from-x);
  top: var(--from-y);
  opacity: min(1, calc(var(--fly) * 8), calc((1 - var(--fly)) * 8));
  translate: calc(-50% + (var(--to-x) - var(--from-x)) * var(--fly)) calc(-50% + (var(--to-y) - var(--from-y)) * var(--fly) - sin(calc(var(--fly) * 180deg)) * 14cqh);
  scale: calc(1 - 0.12 * var(--fly));
}

.flight[data-kind="note"] {
  --from-x: 91cqw;
  --from-y: 94cqh;
}

@container (max-width: 720px) {
  .panes {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 2fr) 1px minmax(0, 3fr);
  }

  .window {
    translate: 0 calc((1 - var(--side, 1)) * 24px);
  }

  .flight {
    --from-x: 50cqw;
    --from-y: 75cqh;
    --to-x: 50cqw;
    --to-y: 36cqh;
  }

  .flight[data-kind="note"] {
    --from-x: 68cqw;
    --from-y: 94cqh;
  }
}

/* On a short phone frame the review is the content and the terminal is context, sized to hold exactly one edit. */
@container sidecar (max-width: 720px) and (max-height: 720px) {
  .panes {
    @apply gap-1 pb-3;
    grid-template-rows: --spacing(30) 1px minmax(0, 1fr);
  }

  /* Tall enough that the options' 44 px coarse hit area clears the pane's clip above them. */
  .bar {
    @apply h-11;
  }

  /* The terminal's last row: the panes' 1rem inset plus its 7.5rem, less a row. */
  .flight {
    --to-y: --spacing(30);
  }
}
</style>
