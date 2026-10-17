<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { SageToy } from "~/utils/play/sage";

import { Kbd } from "@cela/design";
import { useReel } from "~/utils/play/reel";
import { SAGE_REEL, sageToy, sizeOf } from "~/utils/play/sage";
import { SAGE_SCRIPT } from "~/utils/play/script/sage";

const { mode = "live", paused = false } = defineProps<{ mode?: SceneMode; paused?: boolean }>();

const root = useTemplateRef<HTMLElement>("root");
const input = useTemplateRef<HTMLInputElement>("input");
const visible = ref(false);
const playing = computed(() => visible.value && !paused);
let toy: SageToy | undefined;

const reel = useReel({
  reel: SAGE_REEL,
  mode,
  root,
  visible: playing,
  visitor: (state) =>
    (toy = sageToy(state, {
      tween: (name, value, options) => reel.tween(name, value, options),
      draw: (selector, to, options) => reel.draw(selector, to, options),
      turn: () => Number.parseFloat(root.value ? getComputedStyle(root.value).getPropertyValue("--turn") : "0") || 0,
    })),
  beats: SAGE_SCRIPT.beats,
});

defineExpose({ ...reel.seekable, ...reel.control, show: reel.show });

const state = computed(() => reel.view.current);

const folded = computed(() => mode === "live" && state.value.slot === "hidden" && !state.value.held);

const live = (): SageToy | undefined => {
  reel.ensureVisitor();
  return toy;
};

const onKey = (event: KeyboardEvent): void => {
  if (event.code === "AltRight") reel.takeOver();
  if (reel.driver.value !== "visitor") return;
  const active = live();
  if (event.key === "Escape") {
    if (active?.escape()) event.preventDefault();
    return;
  }
  active?.keydown(event);
};

const onKeyUp = (event: KeyboardEvent): void => {
  if (reel.driver.value === "visitor") toy?.keyup(event);
};

const coarse = (): boolean => window.matchMedia("(pointer: coarse)").matches;

const toggleHold = (active: SageToy): void => {
  if (state.value.held) active.lift();
  else {
    active.press();
    setTimeout(() => input.value?.focus(), 200);
  }
};

const onHoldTwin = (): void => {
  const active = live();
  if (active) toggleHold(active);
};

const onPress = (event: PointerEvent): void => {
  if (mode === "film") return;
  const active = live();
  if (!active) return;
  if (state.value.slot === "confirming") {
    active.run();
    return;
  }
  if (coarse()) {
    toggleHold(active);
    return;
  }
  if (event.currentTarget instanceof Element) event.currentTarget.setPointerCapture(event.pointerId);
  active.press();
};

const onLift = (): void => {
  if (mode === "film" || coarse()) return;
  if (reel.driver.value === "visitor") toy?.lift();
};

const onInput = (event: Event): void => {
  if (event.target instanceof HTMLInputElement) live()?.type(event.target.value);
};

const onSubmit = (): void => {
  live()?.lift();
  if (input.value) input.value.value = "";
};
</script>

<template>
  <PlayFrame
    v-model:visible="visible"
    class="sage-frame"
    :driver="reel.driver.value"
    label="Sage"
    :mode="mode"
    @key="onKey"
    @keyup="onKeyUp"
    @leave="onLift"
    @take="reel.takeOver()"
  >
    <div
      ref="root"
      class="sage"
      :data-held="state.held"
      :data-look="state.look"
      :data-mode="mode"
      :data-slot="state.slot"
    >
      <div class="menubar" aria-hidden="true" />
      <div class="stage">
        <i class="notch-frame" data-film-anchor="notch" aria-hidden="true" />
        <div
          class="island"
          data-island
          @lostpointercapture="onLift"
          @pointercancel="onLift"
          @pointerdown="onPress"
          @pointerup="onLift"
        >
          <i class="piece body" />
          <i class="piece cap" />
          <i class="piece corner" data-side="left" />
          <i class="piece corner" data-side="right" />
          <i class="box" data-island-box />
          <PlaySageRing class="mark-ring" :look="state.look" />
          <div class="anchor" :aria-live="reel.driver.value === 'visitor' ? 'polite' : 'off'">
          <div
            v-if="state.slot !== 'hidden'"
            :key="state.slot"
            class="content"
            :data-slot="state.slot"
            :style="{ '--content-w': sizeOf(state).w }"
          >
            <template v-if="state.slot === 'heard'">
              <div class="row header">
                <i class="ring-slot" />
                <span class="words" :data-live="state.live" data-words>{{ state.words }}</span>
                <i v-if="state.live" class="caret" />
                <span class="spacer" />
                <span v-if="state.route" class="chip" data-route>{{ state.route }}</span>
                <span v-else-if="state.live" class="tag" data-tag>{{ state.tag }}</span>
              </div>
              <div class="row trace" aria-hidden="true">
                <svg class="wave" preserveAspectRatio="none" viewBox="0 0 100 14">
                  <path d="M0 7 L4 3 L8 11 L12 2 L16 12 L20 4 L24 10 L28 1 L32 13 L36 5 L40 9 L44 2 L48 12 L52 3 L56 11 L60 4 L64 10 L68 2 L72 12 L76 5 L80 9 L84 3 L88 11 L92 5 L96 9 L100 7" />
                </svg>
                <i class="cover"><i class="head" /></i>
              </div>
            </template>
            <template v-else-if="state.slot === 'working'">
              <div class="row header">
                <i class="ring-slot" />
                <span class="title" data-goal>{{ state.goal }}</span>
              </div>
              <div v-for="(step, index) in state.steps" :key="index" class="row step" data-step :data-done="step.done" :style="{ '--in': `var(--st${index}, 1)`, '--tick': `var(--tk${index}, 1)` }">
                <span class="mark">
                  <svg class="check" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" /></svg>
                  <i class="pending" />
                </span>
                <span class="step-text">{{ step.text }}</span>
              </div>
            </template>
            <div v-else-if="state.slot === 'confirming' && state.card" class="confirm" data-film-anchor="card">
              <div class="row header">
                <i class="ring-slot" />
                <span class="question" data-card>{{ state.card.question }}</span>
              </div>
              <div class="row detail">{{ state.card.detail }}</div>
              <div class="row countdown"><span class="track"><i class="fill" data-fill /></span></div>
            </div>
            <template v-else>
              <div class="row header" :data-lines="state.slot === 'asking' ? 2 : 1">
                <i class="ring-slot" />
                <span class="title" data-title>{{ state.title }}</span>
              </div>
            </template>
          </div>
          </div>
        </div>
        <i class="idle" aria-hidden="true" />
        <Transition name="hint">
          <div v-if="folded" class="hold-hint" data-hold-hint>
            <Kbd keys="opt" label="Hold" />
          </div>
        </Transition>
        <div v-if="state.page" class="page" data-page aria-hidden="true">
          <div class="page-scroll">
            <i class="bar" data-w="3/4" /><i class="bar" data-w="1/2" /><i class="bar" data-w="5/6" /><i class="bar" data-w="2/3" />
            <i class="bar" data-w="1/2" /><i class="bar" data-w="3/4" /><i class="bar" data-w="1/3" />
            <span class="pay-row" data-film-anchor="pay">
              <i class="bar" data-w="1/3" />
              <span class="pay-wrap">
                <span class="pay" data-pay>Pay</span>
                <i class="outline" :data-outlined="state.outlined" />
              </span>
            </span>
          </div>
        </div>
      </div>
      <div v-if="mode === 'live'" class="twins">
        <input
          v-if="state.held"
          ref="input"
          aria-label="Sage"
          autocapitalize="off"
          autocomplete="off"
          class="twin-input"
          enterkeyhint="send"
          @input="onInput"
          @keydown.enter.prevent="onSubmit"
        >
        <button class="twin hold" type="button" aria-label="Hold" :aria-pressed="state.held" data-hold-twin @click="onHoldTwin">
          <Kbd keys="opt" label="Hold" />
        </button>
        <button class="twin" type="button" aria-label="esc" @click="live()?.escape()">
          <Kbd keys="esc" />
        </button>
      </div>
      <PlayBeats v-if="mode === 'film'" :beats="SAGE_SCRIPT.beats" />
    </div>
  </PlayFrame>
</template>

<style scoped>
.sage {
  @apply @container relative size-full overflow-hidden;
  opacity: var(--loop, 1);
}

.menubar {
  @apply absolute inset-x-0 top-0 h-8 bg-raised/60;
}

.stage {
  @apply absolute top-0 left-1/2 w-0 origin-top;
}

@container (max-width: 640px) {
  .stage {
    @apply scale-60;
  }
}

/* Black in both themes, as macOS draws the notch; grown from four pieces so the corners never stretch. */
.island {
  @apply absolute top-0 left-0 cursor-pointer touch-none select-none;
}

.piece {
  @apply absolute top-0 bg-black;
}

.body {
  @apply -left-70 h-80 w-140 origin-top;
  transform: scale(calc(var(--iw) / 560), calc((var(--ih) - var(--ir) + 1) / 320));
}

.cap {
  @apply -left-70 h-6 w-140 origin-top;
  transform: translateY(calc((var(--ih) - var(--ir)) * 1px)) scale(calc((var(--iw) - 2 * var(--ir) + 1) / 560), calc(var(--ir) / 24));
}

.corner {
  @apply left-0 size-6 origin-top-left;
}

.corner[data-side="left"] {
  @apply rounded-bl-full;
  transform: translate(calc(var(--iw) * -0.5px), calc((var(--ih) - var(--ir)) * 1px)) scale(calc(var(--ir) / 24));
}

.corner[data-side="right"] {
  @apply rounded-br-full;
  transform: translate(calc((var(--iw) * 0.5 - var(--ir)) * 1px), calc((var(--ih) - var(--ir)) * 1px)) scale(calc(var(--ir) / 24));
}

.box {
  @apply absolute top-0 -left-70 h-80 w-140 origin-top;
  transform: scale(calc(var(--iw) / 560), calc(var(--ih) / 320));
}

.anchor {
  @apply absolute top-0 left-0 flex w-0 justify-center;
}

/* One ring for every state, riding the island's left edge, so its drawn gap and turn carry across. */
.mark-ring {
  @apply absolute top-10 left-0;
  translate: calc(var(--iw) * -0.5px + 20px) 0;
  opacity: var(--ic, 1);
}

.sage[data-slot="hidden"] .mark-ring {
  @apply opacity-0;
}

.ring-slot {
  @apply size-5.5 flex-none;
}

.content {
  @apply flex flex-none flex-col gap-2.5 px-5 pt-10 pb-4 text-white;
  width: calc(var(--content-w) * 1px);
  opacity: var(--ic, 1);
  translate: 0 calc((1 - var(--ic, 1)) * -4px);
}

/* Not .card, which @cela/design styles globally as a raised panel and would paint white under the white question. */
.confirm {
  @apply flex flex-col gap-2.5;
}

.row {
  @apply flex h-3.5 min-w-0 items-center;
}

.header {
  @apply h-5.5 gap-2.5;
}

.header[data-lines="2"] {
  @apply h-10 items-start;
}

.words {
  @apply min-w-0 truncate typo-body-lg text-white/60;
}

.words[data-live="true"] {
  @apply font-medium text-white;
}

.caret {
  @apply h-4 w-0.5 flex-none bg-primary;
}

.spacer {
  @apply min-w-2 flex-1;
}

.tag {
  @apply flex-none typo-mono-meta text-white/60;
}

.chip {
  @apply flex-none rounded-full bg-primary/20 px-2 py-0.5 typo-mono-meta text-primary;
}

.title,
.question {
  @apply min-w-0 truncate typo-heading text-white;
}

.header[data-lines="2"] .title {
  @apply line-clamp-2 leading-5 whitespace-normal;
}

.trace {
  @apply relative overflow-hidden;
}

.wave {
  @apply absolute inset-0 size-full fill-none stroke-primary;
  stroke-width: 1.3;
  vector-effect: non-scaling-stroke;
  transform: scaleY(calc(1 - var(--flat, 0)));
}

.cover {
  @apply absolute inset-0 bg-black;
  transform: translateX(calc(var(--trace, 0) * 100%));
}

.cover::before {
  @apply absolute inset-x-0 top-1/2 h-px bg-primary content-[''];
  opacity: calc(0.22 + 0.78 * var(--flat, 0));
}

.head {
  @apply absolute top-1/2 -left-0.5 size-1 -translate-y-1/2 rounded-full bg-primary;
  opacity: calc(1 - var(--flat, 0));
}

.step {
  @apply gap-2.5 pl-8;
  opacity: var(--in);
  translate: 0 calc((1 - var(--in)) * 6px);
}

.mark {
  @apply relative grid size-3.5 flex-none place-items-center;
}

.check {
  @apply absolute inset-0 fill-none stroke-primary;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
}

.pending {
  @apply size-1.75 rounded-full bg-primary;
}

.step[data-done="true"] .check {
  opacity: var(--tick);
  scale: calc(0.85 + 0.15 * var(--tick));
}

.step[data-done="true"] .pending {
  opacity: calc(1 - var(--tick));
}

.step-text {
  @apply min-w-0 truncate typo-body text-white;
}

.detail {
  @apply pl-8 typo-mono-meta text-white/60;
}

.countdown {
  @apply pl-8;
}

.track {
  @apply relative h-0.75 w-full overflow-hidden rounded-full bg-primary/20;
}

.fill {
  @apply absolute inset-0 origin-left rounded-full bg-primary;
  scale: var(--fill, 0) 1;
}

.idle {
  @apply absolute top-9.25 -left-2.75 h-0.5 w-5.5 rounded-full bg-primary;
  opacity: var(--idle, 0.4);
}

.hold-hint {
  @apply pointer-events-none absolute top-13 left-0 w-max -translate-x-1/2;
}

.hint-enter-active,
.hint-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
}

@media (pointer: coarse) {
  .hold-hint {
    @apply hidden;
  }
}

.page {
  @apply absolute top-28 -left-60 h-64 w-120 overflow-hidden rounded-box border border-border bg-raised shadow-lg;
  opacity: var(--page, 0);
  translate: 0 calc((1 - var(--page, 0)) * 16px);
}

.page-scroll {
  @apply flex flex-col gap-4 p-8;
  translate: 0 calc(var(--scroll, 0) * -9rem);
}

.bar {
  @apply h-3 rounded-full bg-sunken;
}

.bar[data-w="3/4"] {
  @apply w-3/4;
}

.bar[data-w="1/2"] {
  @apply w-1/2;
}

.bar[data-w="5/6"] {
  @apply w-5/6;
}

.bar[data-w="2/3"] {
  @apply w-2/3;
}

.bar[data-w="1/3"] {
  @apply w-1/3;
}

.pay-row {
  @apply mt-4 flex items-center justify-between gap-6 py-2;
}

.pay-wrap {
  @apply relative flex-none;
}

.notch-frame {
  @apply pointer-events-none absolute top-0 -left-67.5 h-37.5 w-135;
}

.pay {
  @apply inline-flex h-10 items-center rounded-full bg-fg px-6 typo-body-strong text-canvas;
}

.outline {
  @apply pointer-events-none absolute -inset-1.5 rounded-full border-2 border-primary;
  opacity: 0;
}

.outline[data-outlined="true"] {
  opacity: var(--pay, 1);
  scale: calc(1.08 - 0.08 * var(--pay, 1));
}

.twins {
  @apply absolute right-4 bottom-4 left-4 hidden items-center gap-2;
}

.twin-input {
  @apply h-11 min-w-0 flex-1 rounded-field border border-border bg-raised px-3 typo-body text-fg;
}

.twin {
  @apply grid size-11 flex-none cursor-pointer place-items-center rounded-field border-0 bg-transparent p-0;
}

.twin.hold {
  @apply w-auto px-3;
}

/* The design system's label is --subtle, about 2.5:1 on the frame. */
.hold-hint :deep(.kbd-label),
.twin :deep(.kbd-label) {
  @apply text-muted;
}

.twin-input:focus-visible,
.twin:focus-visible {
  @apply focus-ring;
}

@media (pointer: coarse) {
  /* Clears the twins: 1rem up, 2.75rem tall, then a 0.5rem gap. */
  .sage-frame {
    --invite-inset: --spacing(17);
  }

  .sage[data-mode="live"] .twins {
    @apply flex;
  }
}
</style>
