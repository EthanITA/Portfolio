type State = "default" | "hover" | "focus";

export const useCursor = defineStore("cursor", () => {
  const position = ref({
    x: 0,
    y: 0,
  });
  const mouseState = reactive({
    isHovering: false,
    isFocused: false,
  });
  const state = computed<State>(() => {
    if (mouseState.isFocused) return "focus";
    else if (mouseState.isHovering) return "hover";
    return "default";
  });

  const updatePosition = (e: MouseEvent) => {
    position.value.x = e.clientX;
    position.value.y = e.clientY;
  };

  // Event delegation: Handle hover states using a single event listener
  const handleHoverState = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains("cursor-pointer")) {
      if (event.type === "mouseenter") {
        mouseState.isHovering = true;
      } else if (event.type === "mouseleave") {
        mouseState.isHovering = false;
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

    window.addEventListener("mousemove", updatePosition);

    window.addEventListener("mousedown", () => {
      mouseState.isFocused = true;
      ts = Date.now();
    });

    window.addEventListener("mouseup", () => {
      mouseState.isFocused = false;
    });

    window.addEventListener("click", () => {
      const isTap = Date.now() - ts < 25;
      if (isTap) mouseState.isFocused = true;
      setTimeout(() => (mouseState.isFocused = false), 100);
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

  return {
    position,
    state,
  };
});
