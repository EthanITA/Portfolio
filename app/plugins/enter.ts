import type { Directive } from "vue";

import { type EnterOptions, enter } from "~/utils/site/motion";

type EnterValue = EnterOptions | number | undefined;

const STAGGER_STEP = 60;
const STAGGER_CAP = 6;

const options = new WeakMap<Element, EnterOptions>();
let observer: IntersectionObserver | undefined;

const watchView = (): IntersectionObserver =>
  (observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        observer?.unobserve(entry.target);
        enter(entry.target, options.get(entry.target));
        options.delete(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
  ));

const resolve = (el: HTMLElement, value: EnterValue, staggered: boolean): EnterOptions => {
  const base = typeof value === "number" ? { delay: value } : { ...value };
  if (!staggered || !el.parentElement) return base;
  const index = Array.from(el.parentElement.children).indexOf(el);
  return { ...base, delay: (base.delay ?? 0) + Math.min(index, STAGGER_CAP) * STAGGER_STEP };
};

// .now runs on mount (title blocks), the default waits for the element to scroll into view.
const vEnter: Directive<HTMLElement, EnterValue> = {
  getSSRProps: () => ({ "data-enter": "" }),
  beforeMount(el) {
    el.dataset.enter = "";
  },
  mounted(el, { modifiers, value }) {
    const opts = resolve(el, value, !!modifiers.stagger);
    if (modifiers.words) opts.words = true;
    if (modifiers.now) {
      enter(el, opts);
      return;
    }
    options.set(el, opts);
    watchView().observe(el);
  },
  beforeUnmount(el) {
    observer?.unobserve(el);
    options.delete(el);
  },
};

declare module "vue" {
  interface GlobalDirectives {
    vEnter: typeof vEnter;
  }
}

export default defineNuxtPlugin((nuxt) => {
  nuxt.vueApp.directive("enter", vEnter);
  nuxt.hook("app:mounted", () => {
    document.documentElement.dataset.ready = "";
  });
});
