<script lang="ts" setup>
const expanded = ref(false);
</script>

<template>
  <div
    :class="{
      'swap-active': expanded,
    }"
    class="swap h-full bg-white card select-auto overflow-x-hidden"
  >
    <figure v-if="$slots.creativity" class="swap-off">
      <slot name="creativity" />
    </figure>
    <div class="swap-off card-body">
      <h3 class="card-title">
        <slot name="header" />
      </h3>
      <div>
        <slot />
      </div>
    </div>
    <div class="swap-on card-body">
      <h3 class="card-title">
        <slot name="header" />
      </h3>
      <slot name="description" />
    </div>
    <div
      :class="{
        'rotate-45': expanded,
      }"
      class="card-actions absolute bottom-4 right-4 h-fit w-fit cursor-pointer"
      @click="expanded = !expanded"
    >
      <svg
        class="size-8 transition-transform duration-200 text-gray-400"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          clip-rule="evenodd"
          d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z"
          fill-rule="evenodd"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped></style>
