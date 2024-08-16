<script lang="ts" setup>
const page = usePage();
onMounted(() => {
  page.tabs.selectionBox = document.getElementById("tab-selection");
  page.tabs.selection.el = document.querySelector(
    "#navigation>[data-index='0'].tab",
  );
});
</script>

<template>
  <nav
    id="navigation"
    class="tabs tabs-boxed glass rounded-full overflow-hidden space-x-1 p-2"
    role="tablist"
  >
    <div
      id="tab-selection"
      :style="page.tabs.selection.style"
      class="fixed shadow border-primary-300 transition-all duration-200 rounded-full bg-primary-200"
    />

    <a
      v-for="(tab, i) in page.tabs.list"
      :class="{
        'hover:bg-primary-100': page.tabs.selection.index !== i,
      }"
      :data-index="i"
      :href="`${tab.href}`"
      class="tab cursor-pointer text-lg px-4 space-x-2 flex-nowrap transition-colors duration-200 ease-out !rounded-full"
      role="tab"
      @click="
        (e: MouseEvent) => {
          page.tabs.selection.index = i;
          page.tabs.selection.el = e.target as HTMLAnchorElement;
        }
      "
    >
      <span class="pointer-events-none">{{ tab.name }}</span>
      <kbd class="kbd kbd-sm pointer-events-none">{{ tab.kbd }}</kbd>
    </a>
  </nav>
</template>

<style scoped></style>
