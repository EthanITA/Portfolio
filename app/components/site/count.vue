<script setup lang="ts">
import { MOTION_EASE } from "@cela/design/utils/motion";
import { animate } from "animejs";

import { motionOn } from "~/utils/site/motion";

const COUNT_MS = 800;

const {
  to,
  from = 0,
  before = "",
  after = "",
  decimals = 0,
  manual = false,
  go = false,
} = defineProps<{ to: number; from?: number; before?: string; after?: string; decimals?: number; manual?: boolean; go?: boolean }>();
const emit = defineEmits<{ start: [] }>();

const el = useTemplateRef<HTMLElement>("el");
const format = (n: number): string => `${before}${n.toFixed(decimals)}${after}`;

let observer: IntersectionObserver | undefined;

const run = (): void => {
  const target = el.value;
  if (!target) return;
  const proxy = { n: from };
  target.textContent = format(from);
  emit("start");
  animate(proxy, {
    duration: COUNT_MS,
    ease: MOTION_EASE.out,
    n: to,
    onUpdate: () => (target.textContent = format(proxy.n)),
    onComplete: () => (target.textContent = format(to)),
  });
};

watch(
  () => go,
  (now, was) => {
    if (manual && now && !was && motionOn()) run();
  },
);

// The final copy is what the HTML ships, so crawlers, no-JS and reduced motion read the real number.
onMounted(() => {
  if (!el.value || manual || !motionOn()) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      run();
    },
    { threshold: 0.6 },
  );
  observer.observe(el.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <span ref="el" data-counter>{{ format(to) }}</span>
</template>
