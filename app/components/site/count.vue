<script setup lang="ts">
import { MOTION_EASE } from "@cela/design/utils/motion";
import { animate } from "animejs";

import { motionOn } from "~/utils/site/motion";

const COUNT_MS = 800;

const { to, before = "", after = "", decimals = 0 } = defineProps<{ to: number; before?: string; after?: string; decimals?: number }>();
const emit = defineEmits<{ start: [] }>();

const el = useTemplateRef<HTMLElement>("el");
const format = (n: number): string => `${before}${n.toFixed(decimals)}${after}`;

let observer: IntersectionObserver | undefined;

// The final copy is what the HTML ships, so crawlers, no-JS and reduced motion read the real number.
onMounted(() => {
  if (!el.value || !motionOn()) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting || !el.value) return;
      observer?.disconnect();
      const target = el.value;
      const proxy = { n: 0 };
      target.textContent = format(0);
      emit("start");
      animate(proxy, {
        duration: COUNT_MS,
        ease: MOTION_EASE.out,
        n: to,
        onUpdate: () => (target.textContent = format(proxy.n)),
        onComplete: () => (target.textContent = format(to)),
      });
    },
    { threshold: 0.6 },
  );
  observer.observe(el.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <span ref="el">{{ format(to) }}</span>
</template>
