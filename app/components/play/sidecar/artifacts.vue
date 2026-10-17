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
          class="part"
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

.part {
  @apply relative hit-area cursor-pointer rounded-lg px-2 py-1 text-fg;
}

.part::before {
  @apply pointer-events-none absolute -inset-0.5 rounded-lg ring-2 ring-primary;
  content: "";
  opacity: 0;
}

.part[data-spot="true"]::before {
  opacity: var(--spot, 1);
}

.part:focus-visible {
  @apply focus-ring;
}

.part[data-block="title"] {
  @apply typo-heading-lg;
}

.part[data-block="sub"] {
  @apply typo-body-lg text-muted;
}

.part[data-block="lead"] {
  @apply max-w-xl typo-body;
}

@media (hover: hover) and (pointer: fine) {
  .part:hover {
    @apply bg-primary-soft;
  }
}
</style>
