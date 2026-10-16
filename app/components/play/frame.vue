<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { ComponentPublicInstance } from "vue";
import type { Driver } from "~/utils/play/reel";

import { Chip, Surface } from "@cela/design";

const { mode, label, driver } = defineProps<{ mode: SceneMode; label: string; driver: Driver }>();

const emit = defineEmits<{ take: []; demo: []; key: [event: KeyboardEvent] }>();

const visible = defineModel<boolean>("visible", { default: false });

const surface = useTemplateRef<ComponentPublicInstance>("frame");
const frameEl = (): HTMLElement | undefined => {
  const el: unknown = surface.value?.$el;
  return el instanceof HTMLElement ? el : undefined;
};

const PASSIVE_KEYS = new Set(["Tab", "Shift", "Meta", "Control", "Alt", "CapsLock", "Escape"]);

const onPointerDown = (event: PointerEvent): void => {
  if (event.target instanceof Element && event.target.closest("[data-play-chip]")) return;
  emit("take");
};

const onKeyDown = (event: KeyboardEvent): void => {
  if (driver === "demo" && !PASSIVE_KEYS.has(event.key) && !event.metaKey) emit("take");
  emit("key", event);
  if (event.key === "Escape" && !event.defaultPrevented) frameEl()?.blur();
};

const onChip = (): void => {
  if (driver === "demo") emit("take");
  else emit("demo");
};

onMounted(() => {
  const el = frameEl();
  if (mode === "film" || !el) return;
  let inView = false;
  const update = (): void => {
    visible.value = inView && document.visibilityState === "visible";
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = !!entry && entry.isIntersecting && entry.intersectionRatio >= 0.5;
      update();
    },
    { threshold: [0, 0.5, 1] },
  );
  observer.observe(el);
  document.addEventListener("visibilitychange", update);
  onBeforeUnmount(() => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
  });
});
</script>

<template>
  <Surface v-if="mode === 'film'" class="play-frame" :data-mode="mode" pad="none" shape="island" variant="sunken">
    <slot />
  </Surface>
  <Surface
    v-else
    ref="frame"
    :aria-label="label"
    class="play-frame"
    :data-driver="driver"
    :data-mode="mode"
    pad="none"
    role="group"
    shape="island"
    tabindex="0"
    variant="sunken"
    @keydown="onKeyDown"
    @pointerdown.capture="onPointerDown"
  >
    <slot />
    <Chip class="play-chip" data-play-chip :selected="driver === 'visitor'" @click="onChip">
      {{ driver === "demo" ? "Take over" : "Play the demo" }}
    </Chip>
  </Surface>
</template>

<style scoped>
.play-frame {
  @apply relative size-full overflow-hidden;
}

.play-frame[data-mode="live"]:focus-visible {
  @apply focus-ring;
}

.play-chip {
  @apply absolute top-3 right-3 z-20;
}
</style>
