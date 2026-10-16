<script setup lang="ts">
import { ThemeToggle } from "@cela/design";

import { nav } from "~/utils/site/links";
</script>

<template>
  <header class="bar">
    <nav class="nav wrap" aria-label="Main">
      <NuxtLink class="home" to="/">Marco Dong</NuxtLink>
      <ul class="items">
        <li v-for="item in nav" :key="item.to">
          <NuxtLink class="item" :to="item.to">{{ item.label }}</NuxtLink>
        </li>
      </ul>
    </nav>
    <ThemeToggle data-tip="Light or dark" />
  </header>
</template>

<style scoped>
.bar {
  @apply print:hidden;
}

.nav {
  @apply flex flex-wrap items-center gap-x-6 gap-y-2 py-4 pe-16;
}

.home {
  @apply typo-heading text-fg no-underline;
}

.items {
  @apply m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0;
}

.item {
  @apply typo-body-md text-muted no-underline transition-colors duration-(--duration-fast) ease-out;

  &[aria-current="page"] {
    @apply text-fg;
  }

  &:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .item:hover {
    @apply text-fg;
  }
}
</style>
