<script lang="ts" setup>
const codeLines = ref<string>(`
#cursor {
  @apply bg-primary glass shadow-primary opacity-90 fixed z-[9999] pointer-events-none;

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
  <div class="max-w-4xl sm:mx-auto py-16 space-y-8 mx-4">
    <h2>Values</h2>
    <div class="grid grid-cols-2 gap-2 sm:-mx-8">
      <AtomCard class="col-span-full">
        <template #header> Quality</template>
        <template #default>
          <p>Excellence in every line of code</p>
          <AtomIde :code="codeLines" class="overflow-x-hidden" language="css" />
        </template>
        <template #description>
          <p>
            I’m committed to delivering <strong>high-quality</strong> work by
            focusing on the details that matter. Whether it's building a project
            from scratch or maintaining an existing one, I ensure that every
            line of code is <strong>clean</strong>, <strong>efficient</strong>,
            and <strong>scalable</strong>. My dedication to excellence means
            going beyond the minimum requirements to create web applications
            that are not only functional but also <strong>polished</strong> and
            <strong>reliable</strong>.
          </p>
        </template>
      </AtomCard>
      <AtomCard>
        <template #header> Transparency</template>
        <p>Trust through open communication</p>
        <template #description>
          <p class="h-fit">
            I believe that <strong>trust</strong> is built upon
            <strong>open communication</strong>. From the initial consultation
            to the final deployment, I keep clients informed and involved at
            every stage of the project. By being
            <strong>transparent</strong> about progress, challenges, and
            timelines, I ensure that there are no surprises—only results that
            meet or exceed expectations.
          </p>
        </template>
      </AtomCard>
      <AtomCard>
        <template #header> Integrity</template>
        <p>Doing what’s right, always</p>
        <template #description>
          <p>
            <strong>Integrity</strong> is at the core of everything I do. I
            believe in doing what's <strong>ethical</strong> and
            <strong>right</strong>, not just what's easy. This means adhering to
            best practices, respecting client confidentiality, and always
            delivering on my promises. My work is guided by a strong moral
            compass, ensuring that every decision I make is in the best interest
            of my clients and their projects.
          </p>
        </template>
      </AtomCard>
    </div>
    <ContentBrands class="mx-auto" />
  </div>
</template>

<style scoped>
p {
  @apply mt-2;
}
</style>
