<script lang="ts" setup>
const techs = ref([
  { name: "Adobe After Effects", logo: "after-effects.svg" },
  { name: "Bitbucket", logo: "bitbucket.svg" },
  { name: "ChatGPT", logo: "chatgpt.svg" },
  { name: "DaVinci Resolve", logo: "davinci-resolve.svg" },
  { name: "Digital Ocean", logo: "digital-ocean.svg" },
  { name: "Docker", logo: "docker.svg" },
  { name: "Figma", logo: "figma.svg" },
  { name: "Gitlab", logo: "gitlab.svg" },
  { name: "JavaScript", logo: "javascript.svg" },
  { name: "Jira", logo: "jira.svg" },
  { name: "Node", logo: "node.svg" },
  { name: "Nuxt", logo: "nuxt.svg" },
  { name: "Python", logo: "python.svg" },
  { name: "Salesforce", logo: "salesforce.svg" },
  { name: "SvelteKit", logo: "svelte.svg" },
  { name: "Tailwind", logo: "tailwind.svg" },
  { name: "TypeScript", logo: "typescript.svg" },
  { name: "Vercel", logo: "vercel.svg" },
  { name: "Vue.js", logo: "vue.svg" },
]);
</script>

<template>
  <AtomMarquee>
    <NuxtImg
      v-for="tech in techs"
      :key="tech.logo"
      :alt="tech.name"
      :src="`/techs/${tech.logo}`"
      height="24"
      loading="lazy"
      width="24"
    />
  </AtomMarquee>
</template>

<style scoped></style>
