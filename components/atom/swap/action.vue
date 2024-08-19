<script lang="ts" setup>
import { PlusIcon } from "@heroicons/vue/24/solid";

const expanded = defineModel<boolean>();
</script>

<template>
  <div
    class="action absolute bottom-4 right-4 h-fit w-fit cursor-pointer"
    @click="expanded = !expanded"
  >
    <PlusIcon
      class="size-8 transition-transform text-white duration-200 shadow rounded-full glass bg-primary-300"
    />
  </div>
</template>

<style scoped></style>
