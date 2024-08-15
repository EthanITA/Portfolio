<script lang="ts" setup>
import { onMounted } from "vue";

const tabs = ref<string[]>(["Tab 1", "Tab 2231231", "Tab 3"]);
const selectionBox = ref<HTMLElement>();

const selectedTab = ref<number>(0);

onMounted(() => {
  watch(
    selectedTab,
    () =>
      nextTick(() => {
        const tab = document.querySelector<HTMLAnchorElement>(
          `[data-index="${selectedTab.value}"]`,
        );
        if (!selectionBox.value || !tab) return;
        selectionBox.value.style.width = `${tab.clientWidth}px`;
        selectionBox.value.style.height = `${tab.clientHeight}px`;
        selectionBox.value.style.transform = `translate(${tab.offsetLeft}px, ${-tab.offsetTop}px)`;
      }),
    { immediate: true },
  );
});
</script>

<template>
  <nav
    class="tabs tabs-boxed glass shadow rounded-full overflow-hidden p-2"
    role="tablist"
  >
    <div
      ref="selectionBox"
      class="fixed transition-all duration-200 rounded-full bg-primary-200"
    />
    <a
      v-for="(tab, i) in tabs"
      :data-index="i"
      class="tab text-lg px-4"
      role="tab"
      @click="() => (selectedTab = i)"
    >
      {{ tab }}
    </a>
  </nav>
</template>

<style scoped></style>
