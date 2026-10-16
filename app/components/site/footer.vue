<script setup lang="ts">
import { links } from "~/utils/site/links";
</script>

<template>
  <footer class="footer">
    <div class="wrap inner">
      <p class="line">Agents wrote a lot of this site. The standard is mine.</p>
      <ul class="contact">
        <li><a :href="links.linkedin" rel="me noopener" target="_blank">LinkedIn</a></li>
        <li><a :href="links.github" rel="me noopener" target="_blank">GitHub</a></li>
        <li><SiteEmail /></li>
        <li><NuxtLink to="/cv">CV</NuxtLink></li>
      </ul>
      <div class="meta">
        <span>Marco Dong · Milan</span>
        <span>Built with Nuxt, three.js and anime.js</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  @apply mt-24 border-t border-border print:hidden;
}

.inner {
  @apply flex flex-col gap-4 py-10;
}

.line {
  @apply typo-heading-lg text-fg;
}

.contact {
  @apply m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0;

  & a {
    @apply typo-body-md text-muted underline-offset-4 transition-colors duration-(--duration-fast) ease-out;
  }

  & a:focus-visible {
    @apply focus-ring;
  }
}

.meta {
  @apply typo-caption flex flex-wrap gap-x-4 gap-y-1 text-subtle;
}

@media (hover: hover) and (pointer: fine) {
  .contact a:hover {
    @apply text-fg underline;
  }
}
</style>
