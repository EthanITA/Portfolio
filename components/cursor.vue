<script lang="ts" setup>
interface Size {
  h: number;
  w: number;
}

type State = "default" | "hover" | "focus";

const pointer = ref<HTMLElement | null>(null);
const sizeState = ref<Record<State, Size>>({
  default: { h: 20, w: 20 },
  hover: { h: 24, w: 24 },
  focus: { h: 36, w: 36 },
});
const size = computed<Size>(() => {
  return sizeState.value[state.value];
});
const position = ref({
  x: 0,
  y: 0,
});
const state = ref<State>("default");

const updatePosition = (e: MouseEvent) => {
  if (!pointer.value) return;
  position.value.x = e.clientX;
  position.value.y = e.clientY;
};

onMounted(() => {
  let ts: number = 0;

  window.addEventListener("mousemove", updatePosition);
  window.addEventListener("mousedown", () => {
    state.value = "focus";
    ts = Date.now();
  });

  window.addEventListener("mouseup", () => {
    const isClick = Date.now() - ts >= 50;
    if (isClick) state.value = "default";
  });

  window.addEventListener("click", () => {
    const isTap = Date.now() - ts < 50;
    if (isTap) {
      state.value = "focus";
      setTimeout(() => {
        state.value = "default";
      }, 100);
    }
  });
});
</script>

<template>
  <div
    ref="pointer"
    :style="{
      width: `${size.w}px`,
      height: `${size.h}px`,
      top: `${position.y}px`,
      left: `${position.x}px`,
    }"
    class="fixed bg-primary -translate-x-1/2 -translate-y-1/2 glass opacity-90 shadow-primary rounded-full duration-200 transition-[height,width] pointer-events-none ease-in-out z-50"
  ></div>
</template>

<style scoped></style>
