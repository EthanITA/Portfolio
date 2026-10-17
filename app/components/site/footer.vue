<script setup lang="ts">
import { links } from "~/utils/site/links";

// A page that ends on its own contact band already draws the violet line and the links, so the footer joins it.
const { endsOnContact = false } = defineProps<{ endsOnContact?: boolean }>();
</script>

<template>
  <footer class="footer" :class="{ joined: endsOnContact }">
    <span v-if="!endsOnContact" v-enter.line class="rule" aria-hidden="true" />
    <div class="wrap inner">
      <p v-enter class="line">Agents wrote a lot of this site. The standard is mine.</p>
      <ul v-if="!endsOnContact" class="contact">
        <li v-enter.stagger><a class="chip-look" :href="links.linkedin" rel="me noopener" target="_blank">LinkedIn</a></li>
        <li v-enter.stagger><a class="chip-look" :href="links.github" rel="me noopener" target="_blank">GitHub</a></li>
        <li v-enter.stagger><SiteEmail class="chip-look" /></li>
        <li v-enter.stagger><NuxtLink class="chip-look" to="/cv">CV</NuxtLink></li>
      </ul>
      <div class="meta">
        <span>Marco Dong · Milan</span>{{ " " }}
        <span>Built with Nuxt, three.js and anime.js</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  @apply relative mt-24 bg-sunken print:hidden;
}

.joined {
  @apply mt-0;

  & .inner {
    @apply pt-0;
  }
}

.rule {
  @apply absolute inset-x-0 top-0 h-px origin-left bg-primary;
}

.inner {
  @apply flex flex-col gap-6 py-14;
}

.line {
  @apply typo-heading-xl max-w-xl text-fg;
}

.contact {
  @apply m-0 flex list-none flex-wrap gap-2 p-0;

  & .chip-look {
    @apply min-h-11 px-3.5 transition-colors duration-(--duration-fast) ease-out;
  }

  & .chip-look:focus-visible {
    @apply focus-ring;
  }
}

.meta {
  @apply typo-mono-meta flex flex-wrap gap-x-4 gap-y-1 text-muted;
}

@media (hover: hover) and (pointer: fine) {
  .contact .chip-look:hover {
    @apply border-border-strong text-fg;
  }
}
</style>
