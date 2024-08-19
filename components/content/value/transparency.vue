<script lang="ts" setup>
const extended = ref(false);
</script>

<template>
  <AtomCard class="image-full bg-[#EFF9FF]">
    <template #header> Transparency</template>
    <template #creativity>
      <NuxtImg
        :class="{
          'blur-xl opacity-50': extended,
        }"
        class="w-full transition-all duration-300 ease-in-out"
        src="images/values/transparency.png"
      />
    </template>
    <AtomSwap v-model="extended" :class="{ 'h-full': extended }" hide-action>
      <template #off>
        <p>Trust through open communication</p>
      </template>
      <template #on>
        <div class="flex size-full items-center justify-center">
          <div class="text-center px-8 md:px-16">
            <p>
              <strong>Trust</strong> is built through <strong></strong
              ><strong>open communication</strong>, ensuring that stakeholders
              are informed and involved. By being
              <strong>transparent</strong> about progress, challenges, and
              timelines, I ensure that only results that meet or exceed
              expectations.
            </p>
          </div>
        </div>
      </template>
    </AtomSwap>
    <AtomSwapAction v-model="extended" />
  </AtomCard>
</template>

<style scoped></style>
