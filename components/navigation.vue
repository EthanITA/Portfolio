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
      class="tab text-lg px-4"
      role="tab"
      @click="
        (e: MouseEvent) => {
          page.tabs.selection.index = i;
          page.tabs.selection.el = e.target as HTMLAnchorElement;
        }
      "
    >
      {{ tab }}
    </a>
  </nav>
</template>

<style scoped></style>
