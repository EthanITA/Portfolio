<script setup lang="ts">
import { Surface } from "@cela/design";
import { spotlight } from "@cela/design/utils/motion";
import { type JSAnimation, type ScrollObserver, animate, onScroll, splitText, stagger } from "animejs";

import { SCRUB_SMOOTH, motionOn } from "~/utils/site/motion";
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

const loop: Step[] = [
  { step: "Read", receipt: "what I typed, what I meant, what it forces" },
  { step: "Board", receipt: "#4 [AI] Crossfade the sequence frames", task: true },
  { step: "Build", receipt: "fix(scroll): crossfade the two frames around the scroll position" },
  { step: "Prove", receipt: "check.ts: 0 failures" },
  { step: "Review" },
  { step: "Ship", receipt: "merged into main" },
];

const TYPE_MS = 16;

const cards = useTemplateRef<HTMLElement>("cards");
const panel = useTemplateRef<HTMLElement>("panel");
const heading = useTemplateRef<HTMLElement>("heading");
const fence = useTemplateRef<{ ripple: (at: number) => void }>("fence");
const stepper = useTemplateRef<HTMLElement>("stepper");
const rail = useTemplateRef<HTMLElement>("rail");
const current = ref(0);

let travel: JSAnimation | undefined;
let scroller: ScrollObserver | undefined;
let landing: IntersectionObserver | undefined;
let landed = 0;
let pending = 0;
const typed = new Set<number>();
const typing: JSAnimation[] = [];

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

// Counted from the rects on every scrolled frame: an observer on the line misses a jump that lands its gap between two cards.
const onScrolled = (): void => {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(read);
};

const land = (): void => {
  landed = performance.now();
  fence.value?.ripple(landed);
};

watch(fence, (scene) => {
  if (scene && landed) scene.ripple(landed);
});

const type = (i: number): void => {
  const receipt = stepper.value?.querySelector<HTMLElement>(`[data-receipt="${i}"]`);
  if (!receipt || typed.has(i)) return;
  typed.add(i);
  const chars = [...receipt.querySelectorAll<HTMLElement>("[data-type]")].flatMap((part) => splitText(part, { chars: true }).chars as HTMLElement[]);
  for (const char of chars) char.style.opacity = "0";
  receipt.dataset.typed = "";
  if (chars.length) typing.push(animate(chars, { opacity: [0, 1], duration: 1, delay: stagger(TYPE_MS) }));
};

// The runner reaches node i at i fifths of its travel, so each receipt types once as it gets there and never untypes.
const reveal = (progress: number): void => {
  loop.forEach((_, i) => {
    if (progress >= i / (loop.length - 1) - 0.001) type(i);
  });
};

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
  if (!stepper.value || !rail.value) return;
  scroller = onScroll({ target: stepper.value, enter: "bottom top", leave: "min+=50% top", sync: SCRUB_SMOOTH });
  travel = animate(rail.value, {
    ease: "linear",
    translateX: ["0%", "100%"],
    translateY: ["0%", "100%"],
    autoplay: scroller,
    onUpdate: (self) => reveal(self.progress),
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScrolled);
  window.removeEventListener("resize", onScrolled);
  cancelAnimationFrame(pending);
  landing?.disconnect();
  typing.forEach((animation) => animation.revert());
  travel?.revert();
  scroller?.revert();
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

.coarse {
  @apply hidden;
}

@media (pointer: coarse) {
  .fine {
    @apply hidden;
  }

  .coarse {
    @apply inline;
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

/* Room below the last rule, so the panel is still pinned whole when rule 8 crosses the centre. */
.rules {
  @apply m-0 flex list-none flex-col gap-4 p-0 md:col-start-2 md:pb-[calc(50svh-9rem)];
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
  @apply mt-0.5 size-2.5 shrink-0 rounded-[2px] bg-primary;
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
