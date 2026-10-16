<template>
  <div class="shell">
    <a class="skip" href="#content">Skip to content</a>
    <SiteNav />
    <main id="content" class="main" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.shell {
  @apply flex min-h-dvh flex-col;
}

.main {
  @apply flex-1 outline-none;
}

.skip {
  @apply sr-only;

  &:focus-visible {
    @apply not-sr-only fixed top-3 left-3 z-50 rounded-field bg-raised px-3 py-2 typo-body-md text-fg shadow-md focus-ring;
  }
}
</style>
