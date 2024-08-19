<script lang="ts" setup>
import { PlusIcon } from "@heroicons/vue/24/solid";

const expanded = defineModel<boolean>();
</script>

<template>
  <div class="absolute bottom-4 right-4" @click="expanded = !expanded">
    <button class="btn btn-sm btn-circle btn-primary cursor-pointer">
      <PlusIcon
        :class="{
          'rotate-45': expanded,
        }"
        class="size-full p-1 transition-transform text-white duration-200 rounded-full"
      />
    </button>
  </div>
</template>

<style scoped></style>
