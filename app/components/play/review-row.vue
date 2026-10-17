<script setup lang="ts">
import type { Hunk } from "~/utils/play/sidecar";

import { EDITS } from "~/utils/play/sidecar";

// The shortest edit the playground makes, so its lines read whole from 340 px wide.
const { path, hunks } = EDITS.sidecar;
const approved: Hunk[] = hunks.map((hunk) => ({ ...hunk, verdict: "accepted" }));
</script>

<template>
  <div class="review-row">
    <span class="path">{{ path }}</span>
    <PlaySidecarHunk v-for="hunk in approved" :key="hunk.id" :hunk="hunk" read-only />
  </div>
</template>

<style scoped>
/* The gap clears the verdict pill, which sits half above the hunk's top edge. */
.review-row {
  @apply flex min-w-0 flex-col gap-3 text-left;
}

.path {
  @apply truncate font-mono typo-mono-micro text-muted;
}
</style>
