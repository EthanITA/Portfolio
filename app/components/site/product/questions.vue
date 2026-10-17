<script setup lang="ts">
import { Surface } from "@cela/design";

import type { Product } from "~/utils/site/films";
import type { Question } from "~/utils/site/products";

const { slug, questions } = defineProps<{ slug: Product; questions: Question[] }>();
</script>

<template>
  <section class="questions wrap" :aria-labelledby="`${slug}-questions`">
    <h2 :id="`${slug}-questions`" v-enter.words class="heading">Questions</h2>
    <Surface v-enter class="list" pad="none">
      <details v-for="question in questions" :key="question.ask" class="item">
        <summary class="ask">
          {{ question.ask }}
          <svg class="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <p class="answer"><SiteRuns :runs="question.answer" /></p>
      </details>
    </Surface>
  </section>
</template>

<style scoped>
.questions {
  @apply flex flex-col gap-8;
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.list {
  @apply flex flex-col divide-y divide-border;
}

.ask {
  @apply typo-body-strong flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-fg [&::-webkit-details-marker]:hidden;

  &:focus-visible {
    @apply focus-ring;
  }
}

.caret {
  @apply size-5 shrink-0 fill-none stroke-current stroke-2 text-muted transition-transform duration-(--duration-base) ease-out;
}

.item[open] .caret {
  @apply rotate-180;
}

.item::details-content {
  opacity: 0;
  transition:
    opacity var(--duration-base) var(--ease-out),
    content-visibility var(--duration-base) allow-discrete;
}

.item[open]::details-content {
  opacity: 1;
}

.answer {
  @apply typo-body-md m-0 block max-w-prose text-pretty px-5 pb-5 text-muted;
}

@media (prefers-reduced-motion: reduce) {
  .caret,
  .item::details-content {
    @apply transition-none;
  }
}
</style>
