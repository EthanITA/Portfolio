<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";

import { Surface, Textarea } from "@cela/design";

const { draft, mode, focus = false } = defineProps<{ draft: string; mode: SceneMode; focus?: boolean }>();

const emit = defineEmits<{ draft: [text: string]; cancel: []; save: [] }>();

const field = useTemplateRef<HTMLElement>("field");

onMounted(() => {
  if (focus) field.value?.querySelector("textarea")?.focus();
});
</script>

<template>
  <div class="note" data-film-anchor="note" data-note>
    <Surface class="sheet" pad="none" variant="glass">
      <div ref="field">
        <Textarea
          :model-value="draft"
          placeholder="What should change?"
          :readonly="mode === 'film'"
          :rows="2"
          @update:model-value="emit('draft', $event ?? '')"
        />
      </div>
      <div class="foot">
        <button class="action" type="button" @click="emit('cancel')">Cancel</button>
        <button class="action" data-tone="primary" type="button" :disabled="!draft.trim()" @click="emit('save')">Add to tray</button>
      </div>
    </Surface>
  </div>
</template>

<style scoped>
.note {
  @apply absolute top-full left-0 z-30 mt-2 w-72 max-w-full;
  opacity: var(--pop, 1);
  translate: 0 calc((1 - var(--pop, 1)) * -4px);
  scale: calc(0.97 + 0.03 * var(--pop, 1));
  transform-origin: top left;
}

/* Not .card, which @cela/design styles globally and would add a real border under the glass's inset ring. */
.sheet {
  @apply flex flex-col gap-2 p-2.5 shadow-lg inset-ring inset-ring-(--glass-border-color);
}

.foot {
  @apply flex justify-end gap-1.5;
}

.action {
  @apply relative hit-area h-7 cursor-pointer rounded-full border border-border bg-raised px-3 typo-caption-strong text-fg;
}

.action[data-tone="primary"] {
  @apply border-primary bg-primary text-primary-content;
}

.action:disabled {
  @apply cursor-default opacity-50;
}

.action:focus-visible {
  @apply focus-ring;
}
</style>
