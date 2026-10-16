<script setup lang="ts">
import type { Run } from "~/utils/site/text";

const { runs } = defineProps<{ runs: Run[] }>();
</script>

<template>
  <template v-for="(run, i) in runs" :key="i">
    <template v-if="typeof run === 'string'">{{ run }}</template>
    <code v-else-if="'code' in run" class="code">{{ run.code }}</code>
    <strong v-else-if="'strong' in run" class="strong">{{ run.strong }}</strong>
    <span v-else class="metric">{{ run.metric }}</span>
  </template>
</template>

<style scoped>
.code {
  @apply font-mono;
}

.strong {
  @apply font-semibold text-fg;
}

.metric {
  @apply font-mono font-medium text-accent tabular-nums;
}
</style>
