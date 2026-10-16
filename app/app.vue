<script setup lang="ts">
import { pageTransition } from "~/utils/site/motion";
</script>

<template>
  <NuxtLayout>
    <NuxtPage :transition="pageTransition" />
  </NuxtLayout>
</template>
