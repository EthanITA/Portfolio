<script setup lang="ts">
import { MOTION_EASE } from "@cela/design/utils/motion";
import { Camera } from "~~/films/utils/camera";

const { anchor, at } = defineProps<{ anchor: string; at: number }>();

const DRAW = 600;

const rule = useTemplateRef<HTMLElement>("rule");
const { timeline, onFrame, measure } = useFilmContext();

onMounted(() => {
  if (rule.value) timeline.add(rule.value, { scaleY: [0, 1], duration: DRAW, ease: MOTION_EASE.out }, at);
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
  element.style.left = `${box.x + box.width / 2}px`;
  element.style.top = `${box.y}px`;
  element.style.height = `${box.height}px`;
});
</script>

<template>
  <div ref="rule" class="film-rule" />
</template>

<style scoped>
.film-rule {
  @apply pointer-events-none absolute w-0.5 -translate-x-1/2 origin-top rounded-full bg-primary;
}
</style>
