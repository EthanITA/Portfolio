<script lang="ts" setup>
const expanded = defineModel<boolean>({
  default: false,
});

defineProps<{
  hideAction?: boolean;
}>();
</script>

<template>
  <div :data-expanded="expanded" class="swap select-auto">
    <div class="swap-off">
      <slot name="off" />
    </div>
    <div class="swap-on">
      <slot name="on" />
    </div>
    <AtomSwapAction v-if="!hideAction" v-model="expanded" />
  </div>
</template>

<style scoped>
.swap[data-expanded="true"] {
  @apply swap-active;
}

.swap[data-expanded="true"] .swap-off {
  @apply pointer-events-none;
}

.swap[data-expanded="false"] .swap-on {
  @apply pointer-events-none;
}

.swap[data-expanded="true"] .action {
  @apply rotate-45;
}

.swap-off,
.swap-on {
  @apply overflow-auto;
}
</style>
