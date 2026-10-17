<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { Block, SidecarState } from "~/utils/play/sidecar";

import { BLOCKS } from "~/utils/play/sidecar";

const { state, mode, focus = false } = defineProps<{ state: SidecarState; mode: SceneMode; focus?: boolean }>();

const emit = defineEmits<{ spot: [block: Block]; draft: [text: string]; cancel: []; save: [] }>();

const ORDER: Block[] = ["title", "sub", "lead"];

const onKey = (event: KeyboardEvent, block: Block): void => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  emit("spot", block);
};
</script>

<template>
  <div class="artifacts">
    <article class="page" data-page>
      <div v-for="block in ORDER" :key="block" class="slot">
        <div
          class="block"
          :data-block="block"
          :data-spot="state.spot === block"
          role="button"
          tabindex="0"
          @click="emit('spot', block)"
          @keydown="onKey($event, block)"
        >
          {{ BLOCKS[block] }}
        </div>
        <PlaySidecarNote
          v-if="state.composing && state.spot === block"
          :draft="state.draft"
          :focus="focus"
          :mode="mode"
          @cancel="emit('cancel')"
          @draft="emit('draft', $event)"
          @save="emit('save')"
        />
      </div>
    </article>
  </div>
</template>

<style scoped>
.artifacts {
  @apply size-full min-h-0 p-2;
}

.page {
  @apply flex size-full flex-col gap-3 overflow-hidden rounded-xl border border-border bg-canvas px-8 py-7;
}

.slot {
  @apply relative;
}

.block {
  @apply relative cursor-pointer rounded-lg px-2 py-1 text-fg;
}

.block::after {
  @apply pointer-events-none absolute -inset-0.5 rounded-lg ring-2 ring-primary;
  content: "";
  opacity: 0;
}

.block[data-spot="true"]::after {
  opacity: var(--spot, 1);
}

.block:focus-visible {
  @apply focus-ring;
}

.block[data-block="title"] {
  @apply typo-heading-lg;
}

.block[data-block="sub"] {
  @apply typo-body-lg text-muted;
}

.block[data-block="lead"] {
  @apply max-w-xl typo-body;
}

@media (hover: hover) and (pointer: fine) {
  .block:hover {
    @apply bg-primary-soft;
  }
}
</style>
