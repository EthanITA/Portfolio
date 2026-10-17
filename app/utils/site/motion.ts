import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { animate, splitText, stagger } from "animejs";
import type { TransitionProps } from "vue";

export type EnterOptions = { delay?: number; distance?: number; words?: boolean; line?: boolean; scale?: boolean };

const LINE_MS = 600;

// onScroll's lerp per frame is lerp(.01, .2, sync), so 0.6 trails the scroll by about 120 ms at 60 fps.
export const SCRUB_SMOOTH = 0.6;

// MOTION_SPRING's values: the design's own factories call createSpring, which warns on every call under animejs 4.5.
export const SPRING = {
  gentle: { damping: 15, mass: 1, stiffness: 100 },
  snappy: { damping: 20, mass: 1, stiffness: 250 },
} as const;

// The head script stamps this before first paint, so CSS and script agree on whether anything moves.
export const motionOn = (): boolean => document.documentElement.dataset.motion === "on";

const settle = (el: HTMLElement): void => {
  el.style.removeProperty("opacity");
  el.style.removeProperty("transform");
};

export const enter = (el: HTMLElement, { delay = 0, distance = 12, words = false, line = false, scale = false }: EnterOptions = {}): void => {
  if (!motionOn()) {
    el.dataset.entered = "";
    return;
  }
  if (scale) {
    el.style.opacity = "0";
    el.dataset.entered = "";
    animate(el, { delay, duration: MOTION_DURATION.slow, ease: MOTION_EASE.out, opacity: [0, 1], scale: [0.95, 1], onComplete: () => settle(el) });
    return;
  }
  if (line) {
    el.style.transform = "scaleX(0)";
    el.dataset.entered = "";
    animate(el, { delay, duration: LINE_MS, ease: MOTION_EASE.out, scaleX: [0, 1], onComplete: () => settle(el) });
    return;
  }
  if (words) {
    const parts = splitText(el, { words: true }).words as HTMLElement[];
    for (const part of parts) part.style.opacity = "0";
    el.dataset.entered = "";
    animate(parts, {
      delay: stagger(40, { start: delay }),
      duration: MOTION_DURATION.base,
      ease: MOTION_EASE.out,
      opacity: [0, 1],
      translateY: ["0.4em", "0em"],
      onComplete: () => parts.forEach(settle),
    });
    return;
  }
  el.style.opacity = "0";
  el.dataset.entered = "";
  animate(el, {
    delay,
    duration: MOTION_DURATION.base,
    ease: MOTION_EASE.out,
    opacity: [0, 1],
    translateY: [distance, 0],
    onComplete: () => settle(el),
  });
};

export const pageTransition: TransitionProps = {
  css: false,
  mode: "out-in",
  onLeave: (el, done) => {
    const reduced = !motionOn();
    animate(el, {
      duration: MOTION_DURATION.fast,
      ease: MOTION_EASE.out,
      opacity: [1, 0],
      translateY: reduced ? 0 : [0, -8],
      onComplete: () => {
        window.scrollTo({ top: 0, behavior: "instant" });
        done();
      },
    });
  },
  onEnter: (el, done) => {
    const reduced = !motionOn();
    animate(el, {
      duration: reduced ? MOTION_DURATION.fast : MOTION_DURATION.base,
      ease: MOTION_EASE.out,
      opacity: [0, 1],
      translateY: reduced ? 0 : [12, 0],
      onComplete: () => {
        if (el instanceof HTMLElement) settle(el);
        done();
      },
    });
  },
};
