<script setup lang="ts">
import type { TermRow } from "~/utils/play/sidecar";

import { Surface } from "@cela/design";

const { rows } = defineProps<{ rows: TermRow[] }>();
</script>

<template>
  <Surface class="terminal" pad="none" variant="raised">
    <div class="bar" aria-hidden="true">
      <span class="dots"><i /><i /><i /></span>
      <span class="title">claude</span>
    </div>
    <div class="screen">
      <div v-for="row in rows" :key="row.id" class="row" data-row :data-kind="row.kind" :style="{ '--in': `var(--t${row.id}, 1)` }">
        <!-- Claude Code's ⏺ and ⎿ are drawn, since no web font here has them and each system would substitute its own. -->
        <span class="mark">
          <PlaySidecarIcon v-if="row.kind === 'tool' || row.kind === 'claude'" name="dot" />
          <PlaySidecarIcon v-else-if="row.kind === 'result'" name="elbow" />
          <template v-else>&gt;</template>
        </span>
        <span class="text">{{ row.text }}</span>
      </div>
    </div>
    <div class="input" aria-hidden="true">
      <span class="mark">&gt;</span>
    </div>
  </Surface>
</template>

<style scoped>
.terminal {
  @apply flex min-h-0 flex-col overflow-hidden;
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
  @apply flex min-h-0 flex-1 flex-col justify-end gap-1 overflow-hidden px-4 py-3 font-mono typo-caption;
}

.row {
  @apply flex gap-2 text-fg;
  opacity: var(--in);
  translate: 0 calc((1 - var(--in)) * 4px);
}

.row[data-kind="result"] {
  @apply mb-1.5 pl-4 text-muted;
}

.row[data-kind="told"] {
  @apply text-muted;
}

.mark {
  @apply flex h-lh w-3.5 flex-none items-center justify-center;
}

.row[data-kind="tool"] .mark {
  @apply text-success;
}

.row[data-kind="turn"] .mark,
.row[data-kind="told"] .mark {
  @apply text-primary;
}

.text {
  @apply min-w-0 break-words;
}

.input {
  @apply mx-3 mb-3 flex h-9 flex-none items-center rounded-field border border-border px-3 font-mono typo-caption text-muted;
}
</style>
