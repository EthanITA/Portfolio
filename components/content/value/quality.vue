<script lang="ts" setup>
const css = ref<string>(`
/* CSS */
#cursor {
  /** styling */
  @apply -translate-x-1/2 -translate-y-1/2 rounded-full;
  @apply bg-primary glass opacity-90;

  /** transition */
  transition-property: height, width, background-color, opacity;
  @apply ease-in-out duration-200;

  /** z position */
  @apply fixed z-[9999] pointer-events-none;
}

#cursor[data-type="default"] {
  @apply size-4 opacity-80;
}

#cursor[data-type="hover"] {
  @apply size-8;
}

#cursor[data-type="focus"] {
  @apply size-10 bg-primary-500;
}

`);

const html = `
<!-- HTML -->
<div
  v-if="page.hasCursor"
  id="cursor"
  :data-type="cursor.state"
  :style="position"
/>`;

const ts = `
// TypeScript
import type { CSSProperties } from "vue";

const cursor = useCursor();
const page = usePage();

const position = computed<CSSProperties>(() => ({
  top: \`\${cursor.position.y}px\`,
  left: \`\${cursor.position.x}px\`,
}));
`;

const expanded = ref<boolean>(false);
</script>

<template>
  <AtomCard class="col-span-full">
    <template #header> Quality </template>
    <AtomSwap ref="swapRef" v-model="expanded" hide-action>
      <template #off>
        <p>Readability and scalability, excellence in every line of code</p>
        <div class="md:m-8 mt-8 gap-4 grid md:grid-cols-2">
          <AtomIde :code="html" language="html" />
          <AtomIde :code="ts" language="typescript" />
          <AtomIde :code="css" class="h-80 col-span-full" language="css" />
        </div>
      </template>
      <template #on>
        <div class="flex size-full items-center justify-center">
          <div class="text-center px-8 md:px-32">
            <p>
              I’m committed to delivering <strong>high-quality</strong> work by
              making real difference. Whether it's building a project from
              scratch or maintaining an existing one, I ensure
              <strong>clean</strong>, <strong>efficient</strong>, and
              <strong>scalable</strong> code.
            </p>
            <p>
              In fast-paced environments, I adapt my approach to balance
              <strong>quality</strong> with the need for rapid results, aiming
              for outcomes that meet technical requirements and drive
              <strong>business impact</strong>.
            </p>
          </div>
        </div>
      </template>
    </AtomSwap>
    <AtomSwapAction v-model="expanded" />
  </AtomCard>
</template>

<style scoped></style>
