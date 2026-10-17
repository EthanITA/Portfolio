<script setup lang="ts">
import type { Hunk, Verdict } from "~/utils/play/sidecar";

import { MOTION_DURATION, MOTION_EASE, prefersReducedMotion } from "@cela/design/utils/motion";
import { animate } from "animejs";
import { EDITS } from "~/utils/play/sidecar";

const root = useTemplateRef<HTMLElement>("root");
const { path, hunks } = EDITS.index;
const verdict = ref<Verdict>("accepted");
const shown = computed<Hunk[]>(() => hunks.slice(0, 1).map((hunk) => ({ ...hunk, verdict: verdict.value })));

// The prerendered row is already approved, so only a client that may move takes it back to pending to approve it on cue.
onMounted(() => {
  if (!prefersReducedMotion()) verdict.value = "pending";
});

const approve = (): void => {
  const el = root.value;
  const [first] = shown.value;
  if (!el || !first || verdict.value !== "pending") return;
  verdict.value = "accepted";
  animate(el, { [`--v-${first.id}`]: [0, 1], duration: MOTION_DURATION.base, ease: MOTION_EASE.out, composition: "none" });
};

defineExpose({ approve });
</script>

<template>
  <div ref="root" class="review-row" aria-hidden="true" inert>
    <span class="path">{{ path }}</span>
    <PlaySidecarHunk v-for="hunk in shown" :key="hunk.id" :hunk="hunk" />
  </div>
</template>

<style scoped>
/* The gap clears the verdict pill, which sits half above the hunk's top edge. */
.review-row {
  @apply pointer-events-none flex min-w-0 flex-col gap-3 text-left;
}

.path {
  @apply truncate font-mono typo-mono-micro text-muted;
}
</style>
