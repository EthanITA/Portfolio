<script lang="ts" setup>
const extended = ref(false);
</script>

<template>
  <AtomCard class="image-full bg-[#CBBAA6]">
    <template #header>
      <span
        :class="{
          'text-primary-600': !extended,
        }"
        >Integrity</span
      ></template
    >
    <template #creativity>
      <NuxtImg
        :class="{
          'blur-xl opacity-50': extended,
        }"
        class="w-full transition-all duration-300 ease-in-out"
        src="images/values/integrity.png"
      />
    </template>
    <AtomSwap v-model="extended" :class="{ 'h-full': extended }" hide-action>
      <template #off>
        <p>Doing what’s right, always</p>
      </template>
      <template #on>
        <div class="flex size-full items-center justify-center">
          <div class="text-center px-8 md:px-16">
            <p>
              <strong>Integrity</strong> is at the core of everything I do. I
              believe in doing what's <strong>ethical</strong> and
              <strong>right</strong>, not just what's easy. This means adhering
              to best practices, respecting client confidentiality, and always
              delivering on my promises. My work is guided by a strong moral
              compass, ensuring that every decision I make is in the best
              interest of my clients and their projects.
            </p>
          </div>
        </div>
      </template>
    </AtomSwap>
    <AtomSwapAction v-model="extended" />
  </AtomCard>
</template>

<style scoped></style>
