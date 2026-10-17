<script setup lang="ts">
import type { CvEntry } from "~/utils/site/cv";

const { entry } = defineProps<{ entry: CvEntry }>();
</script>

<template>
  <div class="entry">
    <div class="head">
      <h3 class="title">{{ entry.title }}</h3>
      <div class="sub">
        <span class="org">{{ entry.org }}</span>
        <span class="when">{{ entry.when }}</span>
      </div>
    </div>
    <ul v-if="entry.points" class="points">
      <li v-for="(point, i) in entry.points" :key="i"><SiteRuns :runs="point" /></li>
    </ul>
    <p v-if="entry.note" class="note"><SiteRuns :runs="entry.note" /></p>
    <SiteCvTags v-if="entry.tech" :items="entry.tech" />
  </div>
</template>

<style scoped>
.entry {
  @apply flex flex-col gap-1.5 break-inside-avoid print:gap-0.5;
}

.head {
  @apply flex flex-col;
}

.title {
  @apply typo-heading m-0;
}

.sub {
  @apply flex flex-wrap items-baseline gap-x-2;
}

.org {
  @apply typo-body text-muted;
}

.when {
  @apply typo-mono-meta leading-snug text-muted tabular-nums;
}

.points {
  @apply typo-body m-0 flex flex-col gap-0.5 ps-4 text-fg print:typo-caption print:gap-0 print:leading-snug;

  & li::marker {
    @apply text-primary;
  }
}

.note {
  @apply typo-body text-muted print:typo-caption print:leading-snug;
}
</style>
