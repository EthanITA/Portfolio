<script setup lang="ts">
import { Surface } from "@cela/design";

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
</script>

<template>
  <div class="how">
    <header class="head wrap">
      <h1 class="title">How I work</h1>
      <p class="lead">Agents write a lot of my code. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
    </header>

    <ol class="rules wrap">
      <Surface v-for="(item, i) in rules" :key="item.rule" as="li" class="rule">
        <span class="index">{{ i + 1 }}</span>
        <h2 class="name">{{ item.rule }}</h2>
        <p class="why">{{ item.why }}</p>
      </Surface>
    </ol>

    <div class="fence wrap">
      <SiteMount name="fence">
        <LazyStageFence />
      </SiteMount>
    </div>

    <section class="loop wrap" aria-labelledby="loop-title">
      <h2 id="loop-title" class="heading">From the ask to shipped</h2>
      <p class="body">The agent reads what I typed, what I meant and what it forces. It puts the board up, builds in small steps, and proves each one with a check that could disagree. I review it before anything leaves.</p>
      <ol class="steps">
        <li v-for="step in loop" :key="step">{{ step }}</li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.how {
  @apply flex flex-col gap-16 pt-8 sm:pt-16;
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
  @apply m-0 grid list-none gap-4 p-0 sm:grid-cols-2;
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
  @apply typo-body-md text-muted;
}

.heading {
  @apply typo-display m-0 sm:text-4xl;
}

.steps {
  @apply m-0 flex list-none flex-wrap gap-2 p-0;

  & li {
    @apply typo-caption-medium rounded-full border border-border px-3 py-1;
  }
}
</style>
