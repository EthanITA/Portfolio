import type { Directive, DirectiveBinding } from "vue";

import { type EnterOptions, enter } from "~/utils/site/motion";

type Chained = EnterOptions & { after?: string };
type EnterValue = Chained | number | undefined;

const STAGGER_STEP = 60;
const STAGGER_CAP = 6;

const options = new WeakMap<Element, Chained>();
const started = new WeakSet<Element>();
const handoffs = new WeakMap<Element, number>();
let observer: IntersectionObserver | undefined;

// A follower waits out the handoff of a leader that has begun, and never waits on one still out of view.
const start = (el: HTMLElement, { after, ...opts }: Chained = {}): void => {
  const leader = after ? document.getElementById(after) : undefined;
  const wait = leader ? Math.max(0, (handoffs.get(leader) ?? 0) - performance.now()) : 0;
  handoffs.set(el, performance.now() + enter(el, { ...opts, delay: (opts.delay ?? 0) + wait }));
};

const watchView = (): IntersectionObserver =>
  (observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        observer?.unobserve(entry.target);
        start(entry.target, options.get(entry.target));
        options.delete(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
  ));

const resolve = (el: HTMLElement, value: EnterValue, staggered: boolean): Chained => {
  const base = typeof value === "number" ? { delay: value } : { ...value };
  if (!staggered || !el.parentElement) return base;
  const index = Array.from(el.parentElement.children).indexOf(el);
  return { ...base, delay: (base.delay ?? 0) + Math.min(index, STAGGER_CAP) * STAGGER_STEP };
};

const kind = ({ modifiers }: DirectiveBinding<EnterValue>): string => (modifiers.wide ? "wide" : "");

const begin = (el: HTMLElement, { modifiers, value }: DirectiveBinding<EnterValue>): void => {
  // Off a wide fine-pointer screen these are the LCP, so they paint at once.
  if (modifiers.wide && !("motionWide" in document.documentElement.dataset)) {
    el.dataset.entered = "";
    return;
  }
  const opts = resolve(el, value, !!modifiers.stagger);
  if (modifiers.words) opts.words = true;
  if (modifiers.line) opts.line = true;
  if (modifiers.scale) opts.scale = true;
  if (modifiers.now) {
    started.add(el);
    start(el, opts);
    return;
  }
  options.set(el, opts);
  watchView().observe(el);
};

const vEnter: Directive<HTMLElement, EnterValue> = {
  getSSRProps: (binding) => ({ "data-enter": kind(binding) }),
  beforeMount(el, binding) {
    el.dataset.enter = kind(binding);
    // Hydrating, mounted waits on every async component in the page's Suspense.
    if (binding.modifiers.now && el.isConnected) begin(el, binding);
  },
  mounted(el, binding) {
    if (!started.has(el)) begin(el, binding);
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
