<script setup lang="ts">
import { Segmented } from "@cela/design";
import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { animate } from "animejs";
import type { TransitionProps } from "vue";

import type { Product } from "~/utils/site/films";
import { motionOn } from "~/utils/site/motion";

const options: { label: string; value: Product }[] = [
  { label: "Sidecar", value: "sidecar" },
  { label: "Sage", value: "sage" },
  { label: "AI Shell", value: "shell" },
];

const route = useRoute();
const active = ref<Product>("sidecar");

const fromHash = (hash: string): Product | undefined => options.find((o) => `#${o.value}` === hash)?.value;

onMounted(() => {
  active.value = fromHash(route.hash) ?? active.value;
});

watch(active, (value) => {
  history.replaceState(history.state, "", `#${value}`);
});

const swap: TransitionProps = {
  css: false,
  mode: "out-in",
  onLeave: (el, done) => {
    if (!motionOn()) return done();
    animate(el, { duration: MOTION_DURATION.fast, ease: MOTION_EASE.out, filter: ["blur(0px)", "blur(2px)"], opacity: [1, 0], onComplete: done });
  },
  onEnter: (el, done) => {
    if (!motionOn()) return done();
    animate(el, {
      duration: MOTION_DURATION.base,
      ease: MOTION_EASE.out,
      filter: ["blur(2px)", "blur(0px)"],
      opacity: [0, 1],
      onComplete: () => {
        if (el instanceof HTMLElement) el.style.removeProperty("filter");
        done();
      },
    });
  },
};
</script>

<template>
  <section class="playgrounds wrap">
    <div v-enter class="control">
      <Segmented v-model="active" :options="options" />
    </div>
    <SiteMount v-enter name="play">
      <Transition v-bind="swap">
        <LazyPlaySidecar v-if="active === 'sidecar'" key="sidecar" />
        <LazyPlaySage v-else-if="active === 'sage'" key="sage" />
        <LazyPlayShell v-else key="shell" />
      </Transition>
    </SiteMount>
  </section>
</template>

<style scoped>
.playgrounds {
  @apply flex flex-col items-center gap-6;
}

.control {
  @apply sticky top-20 z-10 md:static;
}
</style>
