<script lang="ts" setup>
import Prism from "prismjs";
import "prismjs/components/prism-typescript";

import "assets/css/prism.css";

defineProps<{
  code: string;
  language?: string;
}>();

onMounted(() => {
  Prism.highlightAll();
});
</script>

<template>
  <div class="mockup-code !select-auto">
    <template v-for="(line, i) in code.trim().split('\n')" :key="i">
      <pre
        :data-prefix="i + 1"
      ><code :class="`lang-${language ?? 'ts'}`">{{ line }}</code></pre>
    </template>
  </div>
</template>

<style scoped></style>
