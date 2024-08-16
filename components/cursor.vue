<script lang="ts" setup>
interface Size {
  h: number;
  w: number;
}

type State = "default" | "hover" | "focus";

const pointer = ref<HTMLElement | null>(null);
const sizeState = ref<Record<State, Size>>({
  default: { h: 16, w: 16 },
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

const handleMouseEnter = () => {
  state.value = "hover";
};

const handleMouseLeave = () => {
  state.value = "default";
};

// Event delegation: Handle hover states using a single event listener
const handleHoverState = (event: Event) => {
  const target = event.target as HTMLElement;
  if (target && target.classList.contains("cursor-pointer")) {
    if (event.type === "mouseenter") {
      handleMouseEnter();
    } else if (event.type === "mouseleave") {
      handleMouseLeave();
    }
  }
};

// MutationObserver to detect dynamic elements
const observeHoverableElements = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (
            (node as HTMLElement).classList &&
            (node as HTMLElement).classList.contains("cursor-pointer")
          ) {
            (node as HTMLElement).addEventListener(
              "mouseenter",
              handleHoverState,
            );
            (node as HTMLElement).addEventListener(
              "mouseleave",
              handleHoverState,
            );
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return observer;
};

onMounted(() => {
  let ts: number = 0;
  let lastState: State;

  window.addEventListener("mousemove", updatePosition);

  window.addEventListener("mousedown", () => {
    lastState = state.value;
    state.value = "focus";
    ts = Date.now();
  });

  window.addEventListener("mouseup", () => {
    state.value = lastState ?? "default";
  });

  window.addEventListener("click", () => {
    const isTap = Date.now() - ts < 25;
    if (isTap) state.value = "focus";
    setTimeout(() => (state.value = lastState ?? "default"), 100);
  });

  document.body.addEventListener("mouseenter", handleHoverState, true);
  document.body.addEventListener("mouseleave", handleHoverState, true);

  // Start observing for new hoverable elements
  const observer = observeHoverableElements();

  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener("mousemove", updatePosition);
    window.removeEventListener("mousedown", () => {});
    window.removeEventListener("mouseup", () => {});
    window.removeEventListener("click", () => {});
    document.body.removeEventListener("mouseenter", handleHoverState, true);
    document.body.removeEventListener("mouseleave", handleHoverState, true);
    observer.disconnect();
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
