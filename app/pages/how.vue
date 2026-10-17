<script setup lang="ts">
import { Surface } from "@cela/design";
import { spotlight } from "@cela/design/utils/motion";
import { type JSAnimation, type ScrollObserver, animate, onScroll } from "animejs";

import { SCRUB_SMOOTH, motionOn } from "~/utils/site/motion";
import { seo } from "~/utils/site/seo";

type Rule = { rule: string; why: string };

useSeoMeta({ title: seo.how.title, description: seo.how.description });
defineOgImage("Card", { title: seo.how.title, sub: "Agents write a lot of my code." });

const rules: Rule[] = [
  {
    rule: "The board goes up before the first edit.",
    why: "I run several agents at once, and the board is how I see what each one is doing.",
  },
  { rule: "Never guess a fact a lookup could settle.", why: "Every claim rests on something read in that session." },
  { rule: "A comment says why, or it doesn't exist.", why: "A comment that narrates the code is the first thing to go stale." },
  { rule: "Files change through file tools, never the shell.", why: "So every change is one I can read before it lands." },
  {
    rule: "Nothing is created under my name unless I asked for it.",
    why: "No ticket, merge request or pushed branch shows up as a side effect.",
  },
  { rule: "Fix the cause, not the symptom.", why: "Cleaning up the damage is step one. The fix is whatever made it possible." },
  {
    rule: "Whether it looks right is my call.",
    why: "Agents prove the logic with types, builds and tests, and I look at what people will see.",
  },
  {
    rule: "A rule I keep breaking is a missing hook.",
    why: "A rule that matters gets a script that stops the agent, not another sentence.",
  },
];

const loop = ["Read", "Board", "Build", "Prove", "Review", "Ship"];

const cards = useTemplateRef<HTMLElement>("cards");
const stepper = useTemplateRef<HTMLElement>("stepper");
const rail = useTemplateRef<HTMLElement>("rail");
let travel: JSAnimation | undefined;
let scroller: ScrollObserver | undefined;

const highlight = (gate: number): void => {
  const card = cards.value?.querySelector<HTMLElement>(`[data-rule="${gate}"]`);
  if (card) spotlight(card);
};

onMounted(() => {
  if (!stepper.value || !rail.value || !motionOn()) return;
  scroller = onScroll({ target: stepper.value, enter: "bottom top", leave: "min+=50% top", sync: SCRUB_SMOOTH });
  travel = animate(rail.value, { ease: "linear", translateX: ["0%", "100%"], translateY: ["0%", "100%"], autoplay: scroller });
});

onBeforeUnmount(() => {
  travel?.revert();
  scroller?.revert();
});
</script>

<template>
  <div class="how">
    <header class="head wrap">
      <h1 v-enter.now.words.wide class="title">How I work</h1>
      <p v-enter.now="320" class="lead">Agents write a lot of my code. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
    </header>

    <ol ref="cards" class="rules wrap">
      <Surface v-for="(item, i) in rules" :key="item.rule" v-enter.stagger as="li" class="rule" :data-rule="i + 1">
        <span class="index">{{ i + 1 }}</span>
        <h2 class="name">{{ item.rule }}</h2>
        <p class="why">{{ item.why }}</p>
      </Surface>
    </ol>

    <div class="fence wrap">
      <SiteMount name="fence">
        <LazyStageFence @gate="highlight" />
      </SiteMount>
    </div>

    <section class="loop wrap" aria-labelledby="loop-title">
      <h2 id="loop-title" v-enter.words class="heading">From the ask to shipped</h2>
      <p v-enter class="body">The agent reads what I typed, what I meant and what it forces. It puts the board up, builds in small steps, and proves each one with a check that could disagree. I review it before anything leaves.</p>
      <div ref="stepper" class="stepper">
        <span class="track" aria-hidden="true" />
        <span ref="rail" class="rail" aria-hidden="true"><span class="runner" data-runner /></span>
        <ol class="steps">
          <li v-for="step in loop" :key="step" v-enter.stagger class="step" :data-review="step === 'Review' || undefined">
            <span class="node" aria-hidden="true" />
            <span class="label">{{ step }}</span>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<style scoped>
.how {
  @apply flex flex-col gap-20 pt-8 sm:pt-16;
}

.head,
.loop {
  @apply flex flex-col gap-4;
}

.title {
  @apply m-0 text-5xl font-bold tracking-tight sm:text-7xl;
}

.lead,
.body {
  @apply typo-body-lg max-w-2xl text-muted;
}

.rules {
  @apply m-0 grid list-none gap-4 p-0 md:grid-cols-2;
}

.rule {
  @apply flex flex-col gap-2;
}

.index {
  @apply typo-mono-meta text-primary;
}

.name {
  @apply typo-heading-lg m-0;
}

.why {
  @apply typo-body text-muted;
}

.heading {
  @apply typo-display m-0 sm:text-4xl;
}

.stepper {
  @apply relative mt-6;
}

.steps {
  @apply m-0 grid list-none grid-rows-6 gap-0 p-0 sm:grid-cols-6 sm:grid-rows-1;
}

.step {
  @apply flex min-h-14 items-center gap-4 sm:min-h-0 sm:flex-col sm:gap-3;
}

.node {
  @apply relative z-1 size-3 shrink-0 rounded-full border-2 border-border-strong bg-canvas;
}

.label {
  @apply typo-body-strong flex flex-col gap-1.5 sm:items-center;
}

.step[data-review] .label::after {
  @apply block h-0.5 w-6 rounded-full bg-primary;
  content: "";
}

.track,
.rail {
  @apply absolute top-[calc(100%/12)] bottom-[calc(100%/12)] left-1.5 w-0 sm:top-1.5 sm:right-[calc(100%/12)] sm:bottom-auto sm:left-[calc(100%/12)] sm:h-0 sm:w-auto;
}

.track {
  @apply border-s border-border sm:border-s-0 sm:border-t;
}

.rail {
  @apply z-2;
}

:root:not([data-motion="on"]) .rail {
  translate: 100% 100%;
}

.runner {
  @apply absolute top-0 left-0 size-3 -translate-1/2 rounded-full bg-primary ring-4 ring-primary/20;
}
</style>
