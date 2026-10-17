<script setup lang="ts">
import { Surface } from "@cela/design";

import { emailParts } from "~/utils/site/links";

const COPIED_MS = 2000;

const { name, handle, href, email = false } = defineProps<{ name: string; handle?: string; href?: string; email?: boolean }>();

const address = ref<string>();
const copied = ref(false);
let reset: ReturnType<typeof setTimeout> | undefined;
let live = true;

const tag = computed(() => (address.value ? "button" : href ? "a" : "div"));
const attrs = computed(() => {
  if (address.value) return { type: "button" };
  if (href) return { href, rel: "me noopener", target: "_blank" };
  return {};
});

// Joined only in the browser, like SiteEmail, so the address never reaches the prerendered HTML.
onMounted(() => {
  if (email) address.value = emailParts.join("@");
});

const copy = async (): Promise<void> => {
  if (!address.value) return;
  try {
    await navigator.clipboard.writeText(address.value);
  } catch {
    // No clipboard (an insecure origin, a denied permission) still has to reach the address.
    location.href = `mailto:${address.value}`;
    return;
  }
  if (!live) return;
  clearTimeout(reset);
  copied.value = true;
  reset = setTimeout(() => (copied.value = false), COPIED_MS);
};

onBeforeUnmount(() => {
  live = false;
  clearTimeout(reset);
});
</script>

<template>
  <Surface v-press :as="tag" pad="md" class="channel" v-bind="attrs" @click="copy">
    <span class="name" :aria-live="email ? 'polite' : undefined">{{ copied ? "Copied" : name }}</span>
    <!-- A line break between inline siblings compiles to nothing, so the text twin would read "LinkedInlinkedin.com". -->
    {{ " " }}
    <span class="handle">{{ address ?? handle }}</span>
    <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path v-if="copied" d="M5 12.5l4.5 4.5L19 7.5" />
      <path v-else-if="email" d="M9 9h10v10H9zM5 15V5h10" />
      <path v-else d="M7 17L17 7M9 7h8v8" />
    </svg>
  </Surface>
</template>

<style scoped>
.channel {
  @apply relative flex w-full flex-col gap-1 pr-12 text-left no-underline;

  &:focus-visible {
    @apply focus-ring;
  }
}

.name {
  @apply typo-body-strong text-fg;
}

/* Holds a line before the email's address is joined, so the card doesn't grow on mount. */
.handle {
  @apply typo-caption min-h-lh truncate font-mono text-muted;
}

.glyph {
  @apply absolute top-5 right-5 size-5 text-muted transition-colors duration-(--duration-fast) ease-out;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

@media (hover: hover) and (pointer: fine) {
  .channel:hover {
    @apply border-border-strong;
  }

  .channel:hover .glyph {
    @apply text-primary;
  }
}
</style>
