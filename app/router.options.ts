import type { RouterConfig } from "nuxt/schema";
import { type RouteLocationNormalized, START_LOCATION } from "vue-router";

// Nuxt replays the first route after load and scrolls it to the top, racing the browser's own restore of a reload.
const scrollToTop = (to: RouteLocationNormalized, from: RouteLocationNormalized): boolean => from !== START_LOCATION || !!to.hash;

export default {
  routes: (routes) => routes.map((route) => ({ ...route, meta: { ...route.meta, scrollToTop } })),
} satisfies RouterConfig;
