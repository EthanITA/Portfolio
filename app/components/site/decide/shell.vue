<script setup lang="ts">
import { Surface } from "@cela/design";
import { MOTION_EASE } from "@cela/design/utils/motion";
import { type JSAnimation, animate } from "animejs";

import { RATED_ASKS, type Tier } from "~/utils/play/shell";
import { motionOn } from "~/utils/site/motion";

const LANES: { tier: Tier; name: string }[] = [
  { tier: "safe", name: "Looks" },
  { tier: "caution", name: "Changes" },
  { tier: "danger", name: "Can't be undone" },
];
const RUN_MS = 2600;
const ASK_END = 800;
const COMMAND_END = 1600;
const PILL_END = 2000;

const strip = useTemplateRef<HTMLElement>("strip");
const chosen = ref(0);
const elapsed = ref(RUN_MS);

let observer: IntersectionObserver | undefined;
let run: JSAnimation | undefined;

const rated = computed(() => RATED_ASKS[chosen.value] ?? RATED_ASKS[0]!);
const rating = computed(() => (rated.value.reason ? `${rated.value.tier} · ${rated.value.reason}` : rated.value.tier));

const phase = (from: number, to: number): number => Math.min(1, Math.max(0, (elapsed.value - from) / (to - from)));
const typed = (text: string, from: number, to: number): [string, string] => {
  const at = Math.round(phase(from, to) * text.length);
  return [text.slice(0, at), text.slice(at)];
};

const ask = computed(() => typed(rated.value.ask, 0, ASK_END));
const command = computed(() => typed(rated.value.command, ASK_END, COMMAND_END));
const pill = computed(() => MOTION_EASE.out(phase(COMMAND_END, PILL_END)));
const lit = computed(() => MOTION_EASE.out(phase(PILL_END, RUN_MS)));

const play = (): void => {
  run?.cancel();
  const clock = { elapsed: 0 };
  elapsed.value = 0;
  run = animate(clock, {
    elapsed: RUN_MS,
    duration: RUN_MS,
    ease: "linear",
    onUpdate: () => (elapsed.value = clock.elapsed),
    onComplete: () => (elapsed.value = RUN_MS),
  });
};

const choose = (at: number): void => {
  chosen.value = at;
  if (motionOn()) play();
};

onMounted(() => {
  if (!strip.value || !motionOn()) return;
  elapsed.value = 0;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      play();
    },
    { threshold: 0.6 },
  );
  observer.observe(strip.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  run?.cancel();
});
</script>

<template>
  <div class="shell">
    <ul class="asks">
      <li v-for="(item, at) in RATED_ASKS" :key="item.ask">
        <button class="ask" type="button" :aria-pressed="at === chosen" @click="choose(at)">{{ item.ask.slice(2) }}</button>
      </li>
    </ul>
    <div ref="strip" class="strip">
      <Surface class="screen" variant="sunken">
        <p class="line">{{ ask[0] }}<span class="rest">{{ ask[1] }}</span></p>
        <p class="line command">{{ command[0] }}<span class="rest">{{ command[1] }}</span></p>
        <p class="rating" :data-tier="rated.tier" :style="{ opacity: pill, transform: `translateY(${(1 - pill) * -6}px)` }">{{ rating }}</p>
      </Surface>
      <ul class="lanes">
        <li v-for="lane in LANES" :key="lane.tier" class="lane" :aria-current="lane.tier === rated.tier || undefined">
          <span class="glow" aria-hidden="true" :style="{ opacity: lane.tier === rated.tier ? lit : 0 }" />
          <span class="name">{{ lane.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.shell {
  @apply grid gap-6 md:grid-cols-[2fr_3fr] md:gap-8;
}

.asks {
  @apply m-0 flex list-none flex-col gap-2 p-0;
}

.ask {
  @apply typo-body-md flex min-h-11 w-full cursor-pointer items-center rounded-field border border-border bg-raised px-3 py-2 text-left font-mono text-muted transition-[border-color,background-color,color] duration-(--duration-press) ease-out;

  &[aria-pressed="true"] {
    @apply border-primary bg-primary-soft text-primary;
  }

  &:focus-visible {
    @apply focus-ring;
  }
}

.strip {
  @apply flex flex-col gap-4;
}

.screen {
  @apply flex min-h-44 flex-col gap-2 font-mono;
}

.line {
  @apply typo-body m-0 break-all whitespace-pre-wrap text-fg;
}

.line::before {
  @apply text-muted content-['$_'];
}

.command {
  @apply text-muted;
}

.rest {
  @apply opacity-0;
}

.rating {
  @apply typo-caption-strong m-0 w-fit rounded-full bg-raised px-2.5 py-0.5 font-sans;

  &[data-tier="safe"] {
    @apply text-success-text;
  }
  &[data-tier="caution"] {
    @apply text-warning-text;
  }
  &[data-tier="danger"] {
    @apply text-error-text;
  }
}

.lanes {
  @apply m-0 grid list-none grid-cols-3 gap-2 p-0;
}

.lane {
  @apply relative flex min-h-14 items-center justify-center overflow-hidden rounded-field border border-border px-2 text-center;
}

.glow {
  @apply absolute inset-0 rounded-field border-2 border-primary bg-primary-soft;
}

.name {
  @apply typo-body-strong relative text-balance text-fg;
}

@media (hover: hover) and (pointer: fine) {
  .ask[aria-pressed="false"]:hover {
    @apply border-border-strong text-fg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ask {
    @apply transition-none;
  }
}
</style>
