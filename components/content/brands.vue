<script lang="ts" setup>
import Marquee from "~/components/atom/marquee.vue";

const techs = ref([
  { name: "Deloitte", logo: "deloitte.svg" },
  { name: "Autotorino", logo: "autotorino.svg" },
  { name: "Indra", logo: "indra.svg" },
  { name: "Minsait", logo: "minsait.svg" },
  { name: "Pinpoint", logo: "pinpoint.svg" },
  { name: "Skillbill", logo: "skillbill.svg" },
]);

const brandsDiv = ref<HTMLDivElement | null>(null);
const isOverflowing = ref(false);
const updateIsOverflowing = () => {
  if (!brandsDiv.value) return;
  isOverflowing.value =
    brandsDiv.value.scrollWidth > brandsDiv.value.clientWidth;
};

onMounted(() => {
  if (!brandsDiv.value) return;
  updateIsOverflowing();
  window.addEventListener("resize", updateIsOverflowing);
});
</script>

<template>
  <div class="isolate py-12 relative overflow-x-hidden select-none">
    <div
      ref="brandsDiv"
      :class="{
        'invisible pointer-events-none': isOverflowing,
      }"
      class="flex gap-4"
    >
      <NuxtImg
        v-for="tech in techs"
        :key="tech.logo"
        :alt="tech.name"
        :src="`/images/brands/${tech.logo}`"
        class="w-auto h-[32px] mx-auto"
        height="24"
        width="24"
      />
    </div>
    <div class="absolute top-12">
      <Marquee v-if="isOverflowing">
        <NuxtImg
          v-for="tech in techs"
          :key="tech.logo"
          :alt="tech.name"
          :src="`/images/brands/${tech.logo}`"
          class="w-auto h-[32px] mx-auto"
          height="24"
          width="24"
        />
      </Marquee>
    </div>
  </div>
</template>

<style scoped></style>
