<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { ShellToy } from "~/utils/play/shell";

import { Kbd, Surface } from "@cela/design";
import { useCaret, useReel } from "~/utils/play/reel";
import { SHELL_SCRIPT } from "~/utils/play/script/shell";
import { SHELL_REEL, SPINNER, shellToy } from "~/utils/play/shell";

const { mode = "live", paused = false } = defineProps<{ mode?: SceneMode; paused?: boolean }>();

const root = useTemplateRef<HTMLElement>("root");
const visible = ref(false);
const playing = computed(() => visible.value && !paused);
let toy: ShellToy | undefined;

const reel = useReel({
  reel: SHELL_REEL,
  mode,
  root,
  visible: playing,
  visitor: (state) => (toy = shellToy(state, { tween: (name, value) => reel.tween(name, value) })),
  beats: SHELL_SCRIPT.beats,
});

defineExpose({ ...reel.seekable, ...reel.control, show: reel.show });

const state = computed(() => reel.view.current);

const caret = useCaret({ visible: playing, reduced: reel.reduced });
const blink = computed(() => (mode === "film" ? state.value.blink : caret.value));
watch(
  () => state.value.line,
  () => (caret.value = 0),
);

// The product's own help line (shell/src/cli.ts), so the empty prompt says how to start.
const HINT = "type ? then what you want";

const waiting = computed(() => mode === "live" && !state.value.line && state.value.phase === "idle" && !state.value.staged);

const TWINS = [
  { key: "Enter", caps: "enter" },
  { key: "y", caps: "y" },
  { key: "N", caps: "N" },
  { key: "Escape", caps: "esc" },
] as const;

const onKey = (event: KeyboardEvent): void => {
  if (reel.driver.value !== "visitor") return;
  reel.ensureVisitor();
  toy?.key(event);
};

const onTwin = (key: string): void => {
  reel.ensureVisitor();
  toy?.key(new KeyboardEvent("keydown", { key, cancelable: true }));
};

const onInput = (event: Event): void => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const live = reel.ensureVisitor();
  if (live.phase !== "idle") return;
  live.line = event.target.value;
  live.staged = undefined;
};
</script>

<template>
  <PlayFrame
    v-model:visible="visible"
    class="shell-frame"
    :driver="reel.driver.value"
    invite-at="top"
    label="AI Shell"
    :mode="mode"
    @key="onKey"
    @take="reel.takeOver()"
  >
    <div ref="root" class="shell" :data-mode="mode" :data-phase="state.phase">
      <Surface class="window" pad="none" variant="raised">
        <div class="bar" aria-hidden="true">
          <span class="dots"><i /><i /><i /></span>
          <span class="title">{{ state.folder }}</span>
        </div>
        <div class="screen" :aria-live="reel.driver.value === 'visitor' ? 'polite' : 'off'">
          <div
            v-for="row in state.rows"
            :key="row.id"
            class="row"
            data-row
            :data-prompt="!!row.folder"
            :data-tier="row.tier ?? 'none'"
          >
            <span v-if="row.folder" class="prompt"><span class="folder">{{ row.folder }}</span> $ </span>
            <span class="text">{{ row.text }}</span>
            <span
              v-if="row.label"
              class="label"
              data-label
              :style="{ '--in': `var(--${row.label.channel}, 1)` }"
            >{{ row.label.text }}</span>
          </div>
          <div v-if="state.phase === 'asking'" class="row" data-ask data-tier="ask">
            <span class="text">put it on your line? [y/N] </span><span class="cursor" :data-blink="blink" />
          </div>
          <div
            v-else-if="state.phase !== 'running'"
            class="row"
            data-line
            data-prompt="true"
            :data-staged="state.staged ?? 'none'"
          >
            <span data-film-anchor="command"><span class="prompt"><span class="folder">{{ state.folder }}</span> $ </span><span class="text">{{ state.line }}</span><span class="cursor" :data-blink="blink" /></span>
            <span v-if="waiting" class="hint" data-hint>{{ HINT }}</span>
          </div>
          <div v-if="state.phase === 'spinning'" class="row spinner" data-spinner aria-hidden="true">
            <svg class="braille" viewBox="0 0 8 16">
              <circle v-for="[x, y] in SPINNER[state.spin]" :key="`${x}${y}`" :cx="2 + x * 4" :cy="2 + y * 4" r="1.25" />
            </svg>
          </div>
        </div>
      </Surface>

      <div v-if="mode === 'live'" class="twins">
        <input
          aria-label="AI Shell"
          autocapitalize="off"
          autocomplete="off"
          class="twin-input"
          enterkeyhint="send"
          placeholder="type ?"
          spellcheck="false"
          :value="state.line"
          @input="onInput"
        >
        <button v-for="twin in TWINS" :key="twin.key" class="twin" type="button" :aria-label="twin.caps" @click="onTwin(twin.key)">
          <Kbd :keys="twin.caps" />
        </button>
      </div>
      <PlayBeats v-if="mode === 'film'" :beats="SHELL_SCRIPT.beats" />
    </div>
  </PlayFrame>
</template>

<style scoped>
/* Clears the title bar: 1rem pad, 2rem bar, 0.5rem gap. */
.shell-frame {
  --invite-inset: --spacing(14);
}

.shell {
  @apply @container relative flex size-full flex-col gap-3 p-4;
  opacity: var(--loop, 1);
}

.window {
  @apply flex min-h-0 flex-1 flex-col overflow-hidden;
}

.bar {
  @apply relative flex h-8 flex-none items-center justify-center border-b border-border;
}

.dots {
  @apply absolute left-3 flex gap-1.5;
}

.dots i {
  @apply size-2.5 rounded-full bg-border-strong;
}

.title {
  @apply typo-mono-meta text-muted;
}

.screen {
  @apply flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-4 py-3 font-mono typo-body;
}

.row {
  @apply m-0 break-all whitespace-pre-wrap text-fg;
}

.row[data-tier="caution"],
.row[data-tier="ask"] {
  @apply text-warning-text;
}

.row[data-tier="danger"] {
  @apply text-error-text;
}

.prompt {
  @apply text-muted;
}

.folder {
  @apply text-primary;
}

.spinner {
  @apply text-primary;
}

.braille {
  @apply inline-block h-4 w-2 fill-current align-text-bottom;
}

.label {
  @apply ml-3 inline-block rounded-full bg-primary-soft px-2 py-0.5 align-middle font-sans typo-caption-strong whitespace-nowrap text-primary;
  opacity: var(--in);
  transform: translateX(calc((1 - var(--in)) * 6px));
}

.shell[data-mode="film"] .label {
  @apply hidden;
}

@container (max-width: 480px) {
  .label {
    @apply mt-1 ml-0 flex w-fit;
  }
}

.cursor {
  @apply ml-px inline-block h-4 w-2 bg-fg align-text-bottom;
}

.cursor[data-blink="1"] {
  @apply opacity-0;
}

.hint {
  @apply ml-2 text-muted;
}

.twins {
  @apply hidden flex-none items-center gap-2;
}

.twin-input {
  @apply h-11 min-w-0 flex-1 rounded-field border border-border bg-raised px-3 font-mono typo-body text-fg placeholder:text-muted;
}

.twin-input:focus-visible,
.twin:focus-visible {
  @apply focus-ring;
}

.twin {
  @apply grid size-11 flex-none cursor-pointer place-items-center rounded-field border-0 bg-transparent p-0;
}

@media (pointer: coarse) {
  .shell[data-mode="live"] .twins {
    @apply flex;
  }
}
</style>
