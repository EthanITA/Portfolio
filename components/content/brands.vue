<script lang="ts" setup>
import Marquee from "~/components/atom/marquee.vue";

const techs = ref([
  {
    name: "Indra",
    logo: "indra.svg",
    website: "https://www.indracompany.com/en",
  },
  {
    name: "Pinpoint",
    logo: "pinpoint.svg",
    website: "https://www.pinpointweb.it/",
  },
  {
    name: "Minsait",
    logo: "minsait.svg",
    website: "https://www.minsait.com/en",
  },
  {
    name: "Skillbill",
    logo: "skillbill.svg",
    website: "https://www.skillbill.it/",
  },
  {
    name: "Autotorino",
    logo: "autotorino.svg",
    website: "https://www.autotorino.it/",
  },
  {
    name: "Deloitte",
    logo: "deloitte.svg",
    website: "https://www.deloittedigital.com/it/en.html",
  },
]);

const brandsDiv = ref<HTMLDivElement | null>(null);
const isOverflowing = ref(false);
const updateIsOverflowing = () => {
  if (!brandsDiv.value) return;
  isOverflowing.value = window.innerWidth <= brandsDiv.value.clientWidth;
};

onMounted(() => {
  updateIsOverflowing();
  window.addEventListener("resize", updateIsOverflowing);
});
</script>

<template>
  <div class="isolate py-12 relative select-none overflow-x-hidden">
    <div
      ref="brandsDiv"
      :class="{
        'invisible pointer-events-none': isOverflowing,
      }"
      class="flex min-w-full w-max justify-between"
    >
      <a
        v-for="tech in techs"
        :key="tech.logo"
        :href="tech.website"
        class="hover:opacity-90 cursor-pointer duration-300 hover:scale-110 transition-[transform,opacity,color] hover:bg-primary-100 p-2 px-4 rounded-full"
        target="_blank"
      >
        <NuxtImg
          :key="tech.logo"
          :alt="tech.name"
          :src="`/images/brands/${tech.logo}`"
          class="min-w-fit w-auto h-[32px]"
          height="24"
          width="24"
        ></NuxtImg>
      </a>
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
