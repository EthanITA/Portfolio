<script lang="ts" setup>
import Prism from "prismjs";
import "prismjs/components/prism-typescript";

import "assets/css/prism.css";

const props = defineProps<{
  code: string;
  language?: "typescript" | "css" | "html";
}>();
const formattedCode = ref<string>("");

onMounted(() => {
  formattedCode.value = Prism.highlight(
    props.code,
    Prism.languages[props.language ?? "typescript"],
    props.language ?? "typescript",
  );
});
</script>

<template>
  <div class="mockup-code !select-auto">
    <div class="h-full overflow-auto border-t-2 border-[#333842]">
      <template v-for="(line, i) in formattedCode.trim().split('\n')" :key="i">
        <pre
          :data-lang="language"
          :data-prefix="i + 1"
          class="last:pb-2"
        ><code v-html="line"></code></pre>
      </template>
    </div>
  </div>
</template>

<style scoped></style>
