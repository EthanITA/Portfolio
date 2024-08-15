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
    class="tabs tabs-boxed glass shadow rounded-full overflow-hidden p-2"
    role="tablist"
  >
    <div
      id="tab-selection"
      :style="page.tabs.selection.style"
      class="fixed transition-all duration-200 rounded-full bg-primary-200"
    />

    <a
      v-for="(tab, i) in page.tabs.list"
      :data-index="i"
      :href="`${tab.href}`"
      class="tab text-lg px-4 space-x-2 border-primary-200"
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
