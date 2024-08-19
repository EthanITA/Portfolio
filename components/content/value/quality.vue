<script lang="ts" setup>
const codeLines = ref<string>(`
#cursor {
  @apply bg-primary glass opacity-90;
  @apply fixed z-[9999] pointer-events-none;

  transition-property: height, width, background-color, opacity;
  @apply ease-in-out duration-200;
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
</script>

<template>
  <AtomCard class="col-span-full">
    <template #header> Quality</template>
    <template #default>
      <p>Excellence in every line of code</p>
      <AtomIde :code="codeLines" language="css" />
    </template>
    <template #description>
      <p>
        I’m committed to delivering <strong>high-quality</strong> work by
        focusing on the details that matter. Whether it's building a project
        from scratch or maintaining an existing one, I ensure that every line of
        code is <strong>clean</strong>, <strong>efficient</strong>, and
        <strong>scalable</strong>. My dedication to excellence means going
        beyond the minimum requirements to create web applications that are not
        only functional but also <strong>polished</strong> and
        <strong>reliable</strong>.
      </p>
    </template>
  </AtomCard>
</template>

<style scoped></style>
