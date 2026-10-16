<script setup lang="ts">
import { emailParts } from "~/utils/site/links";

const { reveal = false } = defineProps<{ reveal?: boolean }>();

const address = ref<string>();

// Joined only in the browser, so the address never appears in the prerendered HTML or the .md twins.
onMounted(() => {
  address.value = emailParts.join("@");
});
</script>

<template>
  <a v-if="address" :href="`mailto:${address}`">{{ reveal ? address : "Email" }}</a>
  <span v-else>Email</span>
</template>
