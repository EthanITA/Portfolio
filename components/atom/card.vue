<script lang="ts" setup>
import { PlusIcon } from "@heroicons/vue/24/solid";

const expanded = ref(false);
</script>

<template>
  <div
    :class="{
      'swap-active': expanded,
    }"
    class="swap h-full bg-white card select-auto"
  >
    <figure v-if="$slots.creativity" class="swap-off">
      <slot name="creativity" />
    </figure>
    <div class="swap-off card-body">
      <h3 class="card-title">
        <slot name="header" />
      </h3>
      <slot />
    </div>
    <div class="swap-on card-body">
      <h3 class="card-title">
        <slot name="header" />
      </h3>
      <div class="flex items-center max-w-2xl h-full mx-auto justify-center">
        <slot name="description" />
      </div>
    </div>
    <div
      :class="{
        'rotate-45': expanded,
      }"
      class="card-actions absolute bottom-4 right-4 h-fit w-fit cursor-pointer"
      @click="expanded = !expanded"
    >
      <PlusIcon
        class="size-8 transition-transform text-white duration-200 shadow rounded-full glass bg-primary-300"
      />
    </div>
  </div>
</template>

<style scoped></style>
