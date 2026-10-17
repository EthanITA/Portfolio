<script setup lang="ts">
import { Surface } from "@cela/design";
import { spotlight } from "@cela/design/utils/motion";
import { type TextSplitter, splitText } from "animejs";

import { BOARD } from "~/utils/site/board";
import { motionOn } from "~/utils/site/motion";
import { seo } from "~/utils/site/seo";

type Rule = { rule: string; why: string };
type Step = { step: string; receipt?: string; task?: boolean };

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

// The home's board shows this same task ticked; here it is still being built when the loop reaches Board.
const [building] = BOARD;

const loop: Step[] = [
  { step: "Read", receipt: "what I typed, what I meant, what it forces" },
  { step: "Board", receipt: building && `#${building.id} [${building.category}] ${building.subject}`, task: true },
  { step: "Build", receipt: "fix(scroll): crossfade the two frames around the scroll position" },
  { step: "Prove", receipt: "check.ts: 0 failures" },
  { step: "Review" },
  { step: "Ship", receipt: "merged into main" },
];

const TYPE_MS = 16;
// The lag of the site's SCRUB_SMOOTH scrubs, kept on the clock so a long frame or a background tab can't strand the runner.
const RUNNER_MS = 125;

type Receipt = { el: HTMLElement; node: number; next: number; chars: HTMLElement[]; at: number; shown: number };

const cards = useTemplateRef<HTMLElement>("cards");
const panel = useTemplateRef<HTMLElement>("panel");
const heading = useTemplateRef<HTMLElement>("heading");
const fence = useTemplateRef<{ ripple: (at: number) => void }>("fence");
const stepper = useTemplateRef<HTMLElement>("stepper");
const rail = useTemplateRef<HTMLElement>("rail");
const current = ref(0);

let landing: IntersectionObserver | undefined;
let landed = 0;
let pending = 0;
let receipts: Receipt[] = [];
let splits: TextSplitter[] = [];
let runner = 0;
let last = 0;
let frame = 0;
let scrubbing = false;
let sizes: ResizeObserver | undefined;

const highlight = (gate: number): void => {
  const card = cards.value?.querySelector<HTMLElement>(`[data-rule="${gate}"]`);
  if (card) spotlight(card);
};

// From md the line is the viewport's centre; under md it is the middle of what the sticky fence leaves visible below it.
const readingLine = (): number => {
  if (matchMedia("(min-width: 768px)").matches || !panel.value) return innerHeight / 2;
  const stuck = Number.parseFloat(getComputedStyle(panel.value).top) + panel.value.offsetHeight;
  return (stuck + innerHeight) / 2;
};

const read = (): void => {
  const line = readingLine();
  const rows = [...(cards.value?.querySelectorAll<HTMLElement>("[data-rule]") ?? [])];
  current.value = rows.filter((row) => row.getBoundingClientRect().top <= line).length;
};

// The end clamps to the page's last scroll position, a pixel early since scrollHeight is rounded, so a stepper near the bottom still reaches 1.
const goal = (el: HTMLElement): number => {
  const top = el.getBoundingClientRect().top;
  const end = Math.max(innerHeight / 2, top + scrollY + 1 - (document.documentElement.scrollHeight - innerHeight));
  return Math.min(1, Math.max(0, (innerHeight - top) / Math.max(1, innerHeight - end)));
};

// Derived each frame from the drawn runner and the clock, so a dropped event can't leave a passed receipt short.
const step = (now: number): void => {
  frame = 0;
  if (!stepper.value || !rail.value) return;
  const to = goal(stepper.value);
  runner = to + (runner - to) * Math.exp(-(last ? now - last : 1000 / 60) / RUNNER_MS);
  if (Math.abs(to - runner) < 0.0005) runner = to;
  rail.value.style.translate = `${runner * 100}% ${runner * 100}%`;
  let busy = runner !== to;
  for (const receipt of receipts) {
    // Read's node sits at 0, so it waits for the stepper to enter rather than typing off screen at load.
    if (!receipt.at && runner > 0 && runner >= receipt.node - 0.001) {
      receipt.at = now;
      receipt.el.dataset.typed = "";
    }
    if (!receipt.at) continue;
    const count = runner >= receipt.next - 0.001 ? receipt.chars.length : Math.min(receipt.chars.length, 1 + Math.floor((now - receipt.at) / TYPE_MS));
    for (; receipt.shown < count; receipt.shown++) receipt.chars[receipt.shown]?.style.removeProperty("opacity");
    busy ||= receipt.shown < receipt.chars.length;
  }
  last = busy ? now : 0;
  if (busy) frame = requestAnimationFrame(step);
};

const wake = (): void => {
  if (scrubbing && !frame) frame = requestAnimationFrame(step);
};

// Counted from the rects on every scrolled frame: an observer on the line misses a jump that lands its gap between two cards.
const onScrolled = (): void => {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(read);
  wake();
};

const land = (): void => {
  landed = performance.now();
  fence.value?.ripple(landed);
};

watch(fence, (scene) => {
  if (scene && landed) scene.ripple(landed);
});

// The runner sits on node i at i fifths of its travel, and a receipt finishes the moment the runner reaches the next node.
const prepare = (el: HTMLElement): Receipt[] =>
  [...el.querySelectorAll<HTMLElement>("[data-receipt]")].map((receipt) => {
    const i = Number(receipt.dataset.receipt);
    const parts = [...receipt.querySelectorAll<HTMLElement>("[data-type]")].map((part) => splitText(part, { chars: true }));
    splits.push(...parts);
    const chars = parts.flatMap((part) => part.chars as HTMLElement[]);
    for (const char of chars) char.style.opacity = "0";
    return { el: receipt, node: i / (loop.length - 1), next: i + 1 < loop.length ? (i + 1) / (loop.length - 1) : Infinity, chars, at: 0, shown: 0 };
  });

onMounted(() => {
  read();
  window.addEventListener("scroll", onScrolled, { passive: true });
  window.addEventListener("resize", onScrolled);
  if (!motionOn()) return;
  if (heading.value) {
    landing = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        landing?.disconnect();
        land();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    landing.observe(heading.value);
  }
  if (!stepper.value) return;
  receipts = prepare(stepper.value);
  runner = goal(stepper.value);
  scrubbing = true;
  sizes = new ResizeObserver(wake);
  sizes.observe(document.body);
  wake();
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScrolled);
  window.removeEventListener("resize", onScrolled);
  cancelAnimationFrame(pending);
  cancelAnimationFrame(frame);
  landing?.disconnect();
  sizes?.disconnect();
  splits.forEach((split) => split.revert());
});
</script>

<template>
  <div class="how">
    <header class="head wrap">
      <h1 v-enter.now.words.wide class="title">How I work</h1>
      <p v-enter.now.wide="320" class="lead">Agents write a lot of my code. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
    </header>

    <section class="gates wrap" aria-labelledby="gates-title">
      <div class="intro">
        <h2 id="gates-title" ref="heading" v-enter.words class="heading">Eight rules, eight gates</h2>
        <p v-enter class="body">
          <span class="fine">Hover a gate for its rule. Click a change to stop it yourself.</span>
          <span class="coarse">Tap a gate for its rule. Tap a change to stop it yourself.</span>
        </p>
      </div>
      <div ref="panel" class="panel">
        <SiteMount name="fence">
          <LazyStageFence ref="fence" :light="current" @gate="highlight" />
        </SiteMount>
      </div>
      <ol ref="cards" class="rules">
        <Surface v-for="(item, i) in rules" :key="item.rule" v-enter as="li" class="rule" :data-rule="i + 1">
          <span class="index">{{ i + 1 }}</span>
          <h3 class="name">{{ item.rule }}</h3>
          <p class="why">{{ item.why }}</p>
        </Surface>
      </ol>
    </section>

    <section class="loop wrap" aria-labelledby="loop-title">
      <h2 id="loop-title" v-enter.words class="heading">From the ask to shipped</h2>
      <p v-enter class="body">The agent reads what I typed, what I meant and what it forces. It puts the board up, builds in small steps, and proves each one with a check that could disagree. I review it before anything leaves.</p>
      <div ref="stepper" class="stepper">
        <span class="track" aria-hidden="true" />
        <span ref="rail" class="rail" aria-hidden="true"><span class="runner" data-runner /></span>
        <ol class="steps">
          <li v-for="(item, i) in loop" :key="item.step" v-enter.stagger class="step" :data-review="item.step === 'Review' || undefined">
            <span class="node" aria-hidden="true" />
            <div class="label">
              <span class="word">{{ item.step }}</span>
              <span v-if="item.receipt" class="receipt" :class="{ task: item.task }" :data-receipt="i">
                <span v-if="item.task" class="box" role="img" aria-label="In progress" />
                <span data-type>{{ item.receipt }}</span>
              </span>
            </div>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<style scoped>
.how {
  @apply flex flex-col gap-16 pt-8 sm:gap-24 sm:pt-16;
}

.head,
.loop,
.intro {
  @apply flex flex-col gap-4;
}

.title {
  @apply m-0 text-5xl font-bold tracking-tight text-balance sm:text-6xl;
}

.lead,
.body {
  @apply typo-body-lg max-w-prose text-pretty text-muted;
}

.fine {
  @apply hidden;
}

/* Hover only exists on a fine pointer, so every other device reads the tap line. */
@media (hover: hover) and (pointer: fine) {
  .fine {
    @apply inline;
  }

  .coarse {
    @apply hidden;
  }
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.gates {
  @apply grid gap-6 md:grid-cols-2 md:gap-x-12 md:gap-y-8;
}

.intro {
  @apply md:col-start-2;
}

/* Under md the panel sticks under the nav and its canvas backdrop hides the rules scrolling beneath it. */
.panel {
  @apply sticky top-0 z-1 -mx-5 h-[calc(40svh+6rem)] bg-canvas px-5 pt-20 pb-4 sm:-mx-8 sm:px-8 md:top-20 md:col-start-1 md:row-span-2 md:row-start-1 md:mx-0 md:h-[calc(100svh-5rem)] md:max-h-240 md:self-start md:p-0;

  /* The violet line runs off both sides, so it fades out instead of ending on a hard crop. */
  & :deep(.mount) {
    mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
  }
}

/* 11rem is rule 8's card (183 px from md up), so the section still reaches the panel's bottom as that card crosses the centre. */
.rules {
  @apply m-0 flex list-none flex-col gap-4 p-0 md:col-start-2 md:pb-[calc(50svh-11rem)];
}

.rule {
  @apply flex flex-col gap-2;
}

.index {
  @apply typo-mono-meta text-primary;
}

.name {
  @apply typo-heading-xl m-0 text-balance;
}

.why {
  @apply typo-body text-pretty text-muted;
}

/* The rail travels its own length, so clip on that axis only: x would cut the phone runner's ring at left-1.5. */
.stepper {
  @apply relative mt-6 overflow-y-clip lg:overflow-x-clip lg:overflow-y-visible;
}

.steps {
  @apply m-0 grid list-none grid-rows-6 gap-0 p-0 lg:grid-cols-6 lg:grid-rows-1 lg:gap-6;
}

.step {
  @apply flex items-start gap-4 pb-6 lg:flex-col lg:items-center lg:gap-3 lg:pb-0;
}

.node {
  @apply relative z-1 mt-1.5 size-3 shrink-0 rounded-full border-2 border-border-strong bg-canvas lg:mt-0;
}

.label {
  @apply flex min-w-0 flex-col gap-1.5 lg:items-center lg:text-center;
}

.word {
  @apply typo-body-strong;
}

.step[data-review] .word::after {
  @apply mt-1.5 block h-0.5 w-6 rounded-full bg-primary lg:mx-auto;
  content: "";
}

.receipt {
  @apply typo-caption font-mono break-words text-muted;
}

:root[data-motion="on"] .receipt:not([data-typed]) {
  @apply invisible;
}

.task {
  @apply flex items-start gap-2 lg:text-left;
}

/* Drawn rather than typed, because DM Mono has no ◼ and it would fall back to another face. */
.box {
  @apply mt-0.5 size-2.5 shrink-0 rounded-xs bg-primary;
}

/* Under lg the nodes sit on each label's first line, so the track runs from the first node's centre to the last. */
.track,
.rail {
  @apply absolute top-3 bottom-[calc(100%/6-0.75rem)] left-1.5 w-0 lg:top-1.5 lg:right-[calc(100%/12)] lg:bottom-auto lg:left-[calc(100%/12)] lg:h-0 lg:w-auto;
}

.track {
  @apply border-s border-border lg:border-s-0 lg:border-t;
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
