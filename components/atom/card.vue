<script lang="ts" setup>
import { PlusIcon } from "@heroicons/vue/24/solid";

const expanded = ref(false);
</script>

<template>
  <div
    :class="{
      'swap-active': expanded,
    }"
    class="h-full bg-white card"
  >
    <div class="card-body">
      <h3 class="card-title">
        <slot name="header" />
      </h3>
      <div class="swap overflow-x-hidden select-auto">
        <div
          :class="{
            'pointer-events-none': expanded,
          }"
          class="swap-off overflow-x-hidden"
        >
          <slot />
        </div>
        <div
          :class="{
            'max-w-2xl': expanded,
            'pointer-events-none': !expanded,
          }"
          class="swap-on"
        >
          <slot name="description" />
        </div>
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

<style scoped>
.card,
.card-body {
  @apply overflow-x-hidden;
}
</style>
