<script setup lang="ts">
import { MOTION_EASE } from "@cela/design/utils/motion";
import { Camera } from "~~/films/utils/camera";

const { anchor, at } = defineProps<{ anchor: string; at: number }>();

const DRAW = 600;

const rule = useTemplateRef<HTMLElement>("rule");
const axis = ref<"x" | "y">("y");
const { timeline, onFrame, measure } = useFilmContext();

onMounted(() => {
  if (rule.value) timeline.add(rule.value, { "--draw": [0, 1], duration: DRAW, ease: MOTION_EASE.out }, at);
});

let placed = false;

onFrame(async () => {
  const element = rule.value;
  const rig = element?.parentElement;
  if (placed || !element || !rig) return;
  placed = true;
  const [box] = await measure([at + DRAW], () => {
    const target = rig.querySelector(`[data-film-anchor="${anchor}"]`);
    return target ? Camera.local({ rig, element: target }) : undefined;
  });
  if (!box) return;
  axis.value = box.width > box.height ? "x" : "y";
  if (axis.value === "x") Object.assign(element.style, { left: `${box.x}px`, top: `${box.y + box.height / 2}px`, width: `${box.width}px` });
  else Object.assign(element.style, { left: `${box.x + box.width / 2}px`, top: `${box.y}px`, height: `${box.height}px` });
  await nextTick();
});
</script>

<template>
  <div ref="rule" class="film-rule" :data-axis="axis" />
</template>

<style scoped>
.film-rule {
  @apply pointer-events-none absolute rounded-full bg-primary;
}
.film-rule[data-axis="y"] {
  @apply w-0.5 -translate-x-1/2 origin-top;
  scale: 1 var(--draw, 0);
}
.film-rule[data-axis="x"] {
  @apply h-0.5 -translate-y-1/2 origin-left;
  scale: var(--draw, 0) 1;
}
</style>
