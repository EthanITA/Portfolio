<script setup lang="ts">
import type { DiffLine, Hunk } from "~/utils/play/sidecar";

const { hunk, readOnly = false } = defineProps<{ hunk: Hunk; readOnly?: boolean }>();

const emit = defineEmits<{ decide: [isAccept: boolean] }>();

const SIGN: Record<DiffLine["mark"], string> = { add: "+", remove: "−", same: " " };
</script>

<template>
  <div class="hunk" :data-hunk="hunk.id" :data-verdict="hunk.verdict" :style="{ '--v': `var(--v-${hunk.id}, 1)` }">
    <span v-if="!readOnly" class="seam">
      <button
        aria-label="Accept the hunk"
        class="arrow"
        data-tone="accept"
        :data-chosen="hunk.verdict === 'accepted'"
        :disabled="hunk.verdict !== 'pending'"
        type="button"
        @click="emit('decide', true)"
      >
        <PlaySidecarIcon name="check" />
      </button>
      <button
        aria-label="Reject the hunk, then say why"
        class="arrow"
        data-tone="reject"
        :data-chosen="hunk.verdict === 'rejected'"
        :disabled="hunk.verdict !== 'pending'"
        type="button"
        @click="emit('decide', false)"
      >
        <PlaySidecarIcon name="x" />
      </button>
    </span>
    <span v-else-if="hunk.verdict !== 'pending'" class="seam">
      <span class="arrow" :data-tone="hunk.verdict === 'rejected' ? 'reject' : 'accept'" data-chosen="true" aria-hidden="true">
        <PlaySidecarIcon :name="hunk.verdict === 'rejected' ? 'x' : 'check'" />
      </span>
      <span class="sr-only">{{ hunk.verdict === "rejected" ? "Rejected the hunk, Claude is told" : "Accepted the hunk" }}</span>
    </span>
    <div v-for="line in hunk.lines" :key="`${line.mark}${line.line}`" class="row" :data-mark="line.mark">
      <span class="num">{{ line.line }}</span>
      <span class="sign">{{ SIGN[line.mark] }}</span>
      <span class="code">{{ line.text }}</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.hunk {
  @apply relative flex flex-col rounded-lg border border-border py-1;
}

.hunk::after {
  @apply pointer-events-none absolute inset-0 rounded-lg border-l-2;
  content: "";
  opacity: var(--v);
}

.hunk[data-verdict="accepted"]::after {
  @apply border-success bg-success/8;
}

.hunk[data-verdict="rejected"]::after {
  @apply border-error bg-error/6;
}

.hunk[data-verdict="pending"]::after {
  @apply hidden;
}

.row {
  @apply flex h-5 min-w-0 items-center font-mono typo-mono-micro whitespace-pre text-fg;
}

.row[data-mark="add"] {
  @apply bg-success-soft;
}

.row[data-mark="remove"] {
  @apply bg-error-soft;
}

.row[data-mark="same"] {
  @apply text-muted;
}

.hunk[data-verdict="rejected"] .row[data-mark="add"] .code {
  @apply text-muted line-through;
}

.num {
  @apply w-9 flex-none pr-2 text-right text-muted tabular-nums;
}

.sign {
  @apply w-3 flex-none text-muted;
}

.code {
  @apply min-w-0 truncate;
}

.seam {
  @apply absolute -top-2.5 right-2 z-10 inline-flex items-center gap-px rounded-full border border-border-strong bg-raised p-px;
}

.arrow {
  @apply relative hit-area grid h-5 w-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-muted;
  --hit-x: calc(100% + 1px);
}

.arrow:disabled,
span.arrow {
  @apply cursor-default;
}

.hunk:not([data-verdict="pending"]) .arrow:not([data-chosen="true"]) {
  @apply hidden;
}

.arrow[data-tone="accept"][data-chosen="true"] {
  @apply bg-success-soft text-success;
}

.arrow[data-tone="reject"][data-chosen="true"] {
  @apply bg-error-soft text-error;
}

.arrow:focus-visible {
  @apply focus-ring;
}

@media (hover: hover) and (pointer: fine) {
  .arrow[data-tone="accept"]:hover:not(:disabled) {
    @apply bg-success-soft text-success;
  }

  .arrow[data-tone="reject"]:hover:not(:disabled) {
    @apply bg-error-soft text-error;
  }
}
</style>
