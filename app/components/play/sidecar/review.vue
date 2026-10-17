<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { DiffLine, SidecarState, TreeRow } from "~/utils/play/sidecar";

import { Kbd } from "@cela/design";
import { Sidecar } from "~/utils/play/sidecar";

const { state, mode, focus = false } = defineProps<{ state: SidecarState; mode: SceneMode; focus?: boolean }>();

const emit = defineEmits<{
  hunk: [id: string, isAccept: boolean];
  under: [path: string, isAccept: boolean];
  select: [path: string];
  undo: [];
  redo: [];
  draft: [text: string];
  cancel: [];
  save: [];
}>();

const SIGN: Record<DiffLine["mark"], string> = { add: "+", remove: "−", same: " " };

const tree = computed(() => Sidecar.tree(state.files));
const file = computed(() => state.files.find((one) => one.path === state.selected));
const churn = computed(() => {
  const lines = file.value?.hunks.flatMap((hunk) => hunk.lines) ?? [];
  return { added: lines.filter((line) => line.mark === "add").length, removed: lines.filter((line) => line.mark === "remove").length };
});
const pendingAll = computed(() => Sidecar.pendingFiles(state, state.files.map((one) => one.path)).length);
const isFilePending = computed(() => !!file.value?.hunks.some((hunk) => hunk.verdict === "pending"));
const undoTop = computed(() => state.undo.at(-1));
const redoTop = computed(() => state.redo.at(-1));
const history = computed(() =>
  state.undo
    .map((decision, index) => ({ key: index, label: decision.label }))
    .reverse()
    .slice(0, 4),
);

const pendingOf = (row: TreeRow): number => Sidecar.pendingFiles(state, row.files).length;
const whatOf = (row: TreeRow): string => (row.kind === "dir" ? `the ${pendingOf(row)} ${pendingOf(row) === 1 ? "file" : "files"} in ${row.name}` : row.name);
const entranceOf = (row: TreeRow): string => {
  const first = state.files.find((one) => row.files.includes(one.path));
  return first ? `var(--${Sidecar.channelOf(first.path)}, 1)` : "1";
};
</script>

<template>
  <div class="review">
    <div class="files">
      <header class="head">
        <span class="title">To review</span>
        <span class="meta">{{ state.files.length }} {{ state.files.length === 1 ? "file" : "files" }}</span>
      </header>
      <div class="tree" data-tree>
        <div
          v-for="row in tree"
          :key="row.path"
          class="node"
          :data-kind="row.kind"
          :data-path="row.path"
          :data-selected="row.path === state.selected"
          :style="{ '--depth': row.depth, '--in': entranceOf(row) }"
        >
          <button v-if="row.kind === 'file'" class="name" type="button" @click="emit('select', row.path)"><span class="label">{{ row.name }}</span></button>
          <span v-else class="name">{{ row.name }}</span>
          <span class="pill" :data-armed="state.confirming === row.path">
            <span v-if="row.kind === 'dir' && state.confirming !== row.path" class="count">{{ pendingOf(row) }}</span>
            <button
              :aria-label="`Approve ${whatOf(row)}`"
              class="dot"
              data-tone="accept"
              :disabled="!pendingOf(row)"
              type="button"
              @click="emit('under', row.path, true)"
            >
              <PlaySidecarIcon name="check" />
            </button>
            <span v-if="state.confirming === row.path" class="ask">Reject {{ row.kind === "dir" ? pendingOf(row) : "it" }}?</span>
            <button
              :aria-label="`${state.confirming === row.path ? 'Press again to reject' : 'Reject'} ${whatOf(row)}`"
              class="dot"
              data-tone="reject"
              :disabled="!pendingOf(row)"
              type="button"
              @click="emit('under', row.path, false)"
            >
              <PlaySidecarIcon name="x" />
            </button>
          </span>
        </div>
      </div>
      <ol class="history" data-film-anchor="history" data-history>
        <li v-for="entry in history" :key="entry.key" class="entry" data-entry>{{ entry.label }}</li>
      </ol>
      <footer v-if="state.files.length || undoTop || redoTop" class="all">
        <button v-if="undoTop" :aria-label="`⌘Z, Undo ${undoTop.label}`" class="travel" data-undo :title="`Undo ${undoTop.label}`" type="button" @click="emit('undo')">
          <PlaySidecarIcon name="undo" />
          <Kbd aria-hidden="true" keys="cmd Z" />
        </button>
        <button v-if="redoTop" :aria-label="`⌘⇧Z, Redo ${redoTop.label}`" class="travel" data-redo :title="`Redo ${redoTop.label}`" type="button" @click="emit('redo')">
          <PlaySidecarIcon name="redo" />
          <Kbd aria-hidden="true" keys="cmd shift Z" />
        </button>
        <span class="spacer" />
        <button class="action" data-tone="danger" :disabled="!pendingAll" type="button" @click="emit('under', '*', false)">
          {{ state.confirming === "*" ? "Reject all? Press again" : "Reject all" }}
        </button>
        <button class="action" data-tone="primary" :disabled="!pendingAll" type="button" @click="emit('under', '*', true)">Approve all</button>
      </footer>
    </div>

    <div class="changes">
      <template v-if="file">
        <header class="head" data-layout="stacked">
          <span class="line">
            <span class="title path">{{ file.path }}</span>
            <span class="churn"><span data-mark="add">+{{ churn.added }}</span> <span data-mark="remove">−{{ churn.removed }}</span></span>
          </span>
          <span class="line" data-split>
            <button class="action" data-tone="danger" :disabled="!isFilePending" type="button" @click="emit('under', file.path, false)">
              {{ state.confirming === file.path ? "Reject? Press again" : "Reject file" }}
            </button>
            <button class="action" data-tone="primary" :disabled="!isFilePending" type="button" @click="emit('under', file.path, true)">Approve file</button>
          </span>
        </header>
        <div class="diff">
          <div
            v-for="hunk in file.hunks"
            :key="hunk.id"
            class="hunk"
            :data-hunk="hunk.id"
            :data-verdict="hunk.verdict"
            :style="{ '--v': `var(--v-${hunk.id}, 1)` }"
          >
            <span class="seam">
              <button
                aria-label="Accept the hunk"
                class="arrow"
                data-tone="accept"
                :data-chosen="hunk.verdict === 'accepted'"
                :disabled="hunk.verdict !== 'pending'"
                type="button"
                @click="emit('hunk', hunk.id, true)"
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
                @click="emit('hunk', hunk.id, false)"
              >
                <PlaySidecarIcon name="x" />
              </button>
            </span>
            <div v-for="line in hunk.lines" :key="`${line.mark}${line.line}`" class="row" :data-mark="line.mark">
              <span class="num">{{ line.line }}</span>
              <span class="sign">{{ SIGN[line.mark] }}</span>
              <span class="code">{{ line.text }}</span>
            </div>
            <PlaySidecarNote
              v-if="state.composing && state.spot === hunk.id"
              :draft="state.draft"
              :focus="focus"
              :mode="mode"
              @cancel="emit('cancel')"
              @draft="emit('draft', $event)"
              @save="emit('save')"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.review {
  @apply grid size-full min-h-0 gap-2 p-2;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
}

.files,
.changes {
  @apply flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-canvas;
}

.head {
  @apply flex flex-none items-center gap-2 border-b border-border px-3 py-2;
}

.head[data-layout="stacked"] {
  @apply flex-col items-stretch gap-1.5;
}

.line {
  @apply flex min-w-0 items-center gap-2;
}

.line[data-split] {
  @apply justify-end gap-1.5;
}

.title {
  @apply typo-caption-strong text-fg;
}

.path {
  @apply min-w-0 truncate font-mono;
}

.meta,
.churn {
  @apply typo-mono-meta text-muted;
}

.churn [data-mark="add"] {
  @apply text-success-text;
}

.churn [data-mark="remove"] {
  @apply text-error-text;
}

.tree {
  @apply flex min-h-0 flex-1 flex-col gap-px overflow-hidden px-1.5 py-1.5;
}

.node {
  @apply flex h-7 flex-none items-center gap-1 rounded-lg pr-1;
  padding-left: calc(var(--depth) * 0.875rem + 0.375rem);
  opacity: var(--in);
  translate: 0 calc((1 - var(--in)) * 4px);
}

.node[data-selected="true"] {
  @apply bg-primary-soft;
}

.name {
  @apply min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-left font-mono typo-caption text-fg;
}

/* The truncation moves to the label, because the button's own overflow would clip its hit area. */
button.name {
  @apply relative hit-area cursor-pointer overflow-visible;
  --hit-y: calc(--spacing(7) + 1px);
}

.label {
  @apply block truncate;
}

.node[data-kind="dir"] .name {
  @apply text-muted;
}

.pill {
  @apply inline-flex flex-none items-center gap-px rounded-full border border-border-strong bg-raised p-px;
}

.pill[data-armed="true"] {
  @apply border-error bg-error-soft;
}

.count {
  @apply py-0 pr-1 pl-1.5 typo-mono-micro text-muted tabular-nums;
}

.ask {
  @apply py-0 pr-0.5 pl-1 typo-meta-semibold whitespace-nowrap text-error-text;
}

.dot {
  @apply relative hit-area grid h-4 w-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-muted;
  --hit-x: calc(100% + 1px);
  --hit-y: calc(--spacing(7) + 1px);
}

.pill[data-armed="true"] .dot[data-tone="reject"] {
  @apply bg-error-soft text-error;
}

.dot:disabled {
  @apply cursor-default opacity-40;
}

.history {
  @apply m-0 flex flex-none list-none flex-col gap-0.5 border-t border-border px-3 py-2;
}

.history:empty {
  @apply hidden;
}

.entry {
  @apply truncate font-mono typo-mono-micro text-muted;
}

.entry:first-child {
  @apply text-fg;
}

.all {
  @apply flex flex-none flex-wrap items-center gap-1.5 border-t border-border px-2 py-2;
}

.spacer {
  @apply flex-1;
}

.all > button {
  --hit-x: calc(100% + --spacing(1.5));
  --hit-y: calc(--spacing(7) + --spacing(1.5));
}

.travel {
  @apply relative hit-area inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-raised px-2 text-fg;
}

.action {
  @apply relative hit-area h-7 cursor-pointer rounded-full border border-border bg-raised px-3 typo-caption-strong whitespace-nowrap text-fg;
}

.action[data-tone="primary"] {
  @apply border-primary bg-primary text-primary-content;
}

.action[data-tone="danger"] {
  @apply text-error-text;
}

.action:disabled {
  @apply cursor-default opacity-50;
}

.dot:focus-visible,
.name:focus-visible,
.travel:focus-visible,
.action:focus-visible,
.arrow:focus-visible {
  @apply focus-ring;
}

.diff {
  @apply flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2;
}

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

.arrow:disabled {
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

@media (hover: hover) and (pointer: fine) {
  .dot[data-tone="accept"]:hover:not(:disabled),
  .arrow[data-tone="accept"]:hover:not(:disabled) {
    @apply bg-success-soft text-success;
  }

  .dot[data-tone="reject"]:hover:not(:disabled),
  .arrow[data-tone="reject"]:hover:not(:disabled) {
    @apply bg-error-soft text-error;
  }
}

@media (pointer: coarse) {
  .travel > .kbd {
    @apply hidden;
  }
}

@container (max-width: 560px) {
  .review {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .tree {
    @apply max-h-32 flex-none overflow-y-auto;
  }

  .history {
    @apply hidden;
  }
}
</style>
