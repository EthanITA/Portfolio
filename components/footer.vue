<script lang="ts" setup>
const socials = [
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/marcodong-838453/",
    icon: "linkedin.svg",
  },
  {
    name: "GitHub",
    url: "https://github.com/EthanITA/",
    icon: "github.svg",
  },
];
</script>

<template>
  <footer class="footer items-center p-4">
    <aside class="grid-flow-col items-center">
      <p class="text-sm text-gray-600">&copy; 2024 Marco Dong</p>
    </aside>
    <nav class="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
      <a
        v-for="social in socials"
        :key="social.name"
        :href="social.url"
        class="cursor-pointer"
        rel="noopener noreferrer"
        target="_blank"
      >
        <img
          :alt="social.name"
          :src="`/images/socials/${social.icon}`"
          class="size-6 grayscale hover:grayscale-0 transition-filter duration-300 ease-in-out scale-100 hover:scale-110"
        />
      </a>
    </nav>
  </footer>
</template>

<style scoped></style>
