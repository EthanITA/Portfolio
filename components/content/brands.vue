<script lang="ts" setup>
const techs = ref([
  {
    name: "Deloitte",
    logo: "deloitte.svg",
    website: "https://www.deloittedigital.com/it/en.html",
  },

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
]);
</script>

<template>
  <div class="flex gap-8">
    <div v-for="tech in techs">
      <NuxtImg
        :key="tech.logo"
        :alt="tech.name"
        :src="`/images/brands/${tech.logo}`"
        class="w-auto !h-[32px] mx-auto"
        height="24"
        width="24"
      />
    </div>
  </div>
</template>

<style scoped></style>
