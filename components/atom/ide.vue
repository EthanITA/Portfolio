<script lang="ts" setup>
import Prism from "prismjs";
import "prismjs/components/prism-typescript";

import "assets/css/prism.css";

const props = defineProps<{
  code: string;
  language?: string;
}>();

const formattedCode = computed<string>(() =>
  Prism.highlight(
    props.code,
    Prism.languages[props.language ?? "ts"],
    props.language ?? "ts",
  ),
);
</script>

<template>
  <div class="mockup-code !select-auto">
    <div class="h-full overflow-auto border-t-2 border-[#333842]">
      <template v-for="(line, i) in formattedCode.trim().split('\n')" :key="i">
        <pre
          :data-prefix="i + 1"
          class="last:pb-2"
        ><code  v-html="line"></code></pre>
      </template>
    </div>
  </div>
</template>

<style scoped></style>
