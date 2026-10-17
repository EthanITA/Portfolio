<script setup lang="ts">
import type { Milestone } from "~/components/site/timeline.vue";
import { links } from "~/utils/site/links";
import { seo } from "~/utils/site/seo";

useSeoMeta({ title: seo.about.title, description: seo.about.description });
useSchemaOrg([defineWebPage({ "@type": ["AboutPage", "ProfilePage"], mainEntity: { "@id": links.identity } })]);
defineOgImage("Card", { title: "I don't know what I don't know, so I go and find out." });

const timeline: Milestone[] = [
  { when: "High school", what: "Built a small humanoid robot driven from a smartphone, for my diploma." },
  { when: "2017", what: "Computer science at the University of Bologna." },
  { when: "2021", what: "Salesforce consultant at Deloitte Digital. I led the rollout of Receptionist 2.0 across client branches." },
  {
    when: "2022",
    what: "Started freelancing. Seven engagements since, each run from the first call to the invoice.",
    show: { kind: "count", to: 7, label: "engagements" },
  },
  { when: "2023", what: "Full stack engineer on Onesait Platform at Indra, a B2B product for Italian energy companies." },
  {
    when: "2023",
    what: "Twilight, a demand test with paid ads: 979 visitors and 113 leads.",
    show: {
      kind: "bars",
      bars: [
        { value: 979, share: 1 },
        { value: 113, share: 113 / 979, note: "11.5%" },
      ],
    },
  },
  { when: "2024", what: "MBA at Bologna Business School, and Startup Geeks." },
  {
    when: "2024",
    what: "LexSA, an AI assistant for tax professionals, built alone end to end.",
    show: { kind: "count", to: 272, after: " of 272", label: "commits are mine" },
  },
  { when: "2025", what: "Software engineer at Klarna." },
  {
    when: "2026",
    what: "AI product engineer at Moneyfarm, and Cela: Sidecar, Sage and AI Shell.",
    show: { kind: "stills", slugs: ["sidecar", "sage", "shell"] },
  },
];

const facts = ["Based in Milan", "Italian native, English at work"];
</script>

<template>
  <div class="about">
    <header class="head wrap">
      <h1 v-enter.now.words.wide class="title">I don't know what I don't know, so I go and find out.</h1>
      <p v-enter.now.wide="320" class="intro">I studied computer science in Bologna and later took an MBA, because I want to build a business and not only the software inside it. Agents write a lot of my code now. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
    </header>

    <section class="section wrap" aria-labelledby="so-far">
      <div class="intro-block">
        <h2 id="so-far" v-enter.words class="heading">So far</h2>
        <p v-enter class="line">Oldest first.</p>
      </div>
      <SiteTimeline :items="timeline" />
    </section>

    <section class="section wrap" aria-labelledby="now">
      <h2 id="now" v-enter.words class="heading">Now</h2>
      <ul class="chips">
        <li v-for="fact in facts" :key="fact" v-enter.stagger class="chip-look">{{ fact }}</li>
        <li v-enter.stagger><a class="chip-look link" :href="links.linkedin" rel="me noopener" target="_blank">LinkedIn</a></li>
        <li v-enter.stagger><a class="chip-look link" :href="links.github" rel="me noopener" target="_blank">GitHub</a></li>
        <li v-enter.stagger><NuxtLink class="chip-look link" to="/cv">CV</NuxtLink></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.about {
  @apply flex flex-col gap-16 pt-8 sm:gap-24 sm:pt-16;
}

.head {
  @apply flex flex-col gap-6;
}

.title {
  @apply m-0 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl;
}

.intro {
  @apply typo-body-lg max-w-prose text-pretty text-muted;
}

.section {
  @apply flex flex-col gap-8;
}

.intro-block {
  @apply flex flex-col gap-3;
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.line {
  @apply typo-body-lg max-w-prose text-pretty text-muted;
}

.chips {
  @apply m-0 flex list-none flex-wrap gap-2 p-0;
}

.link {
  @apply min-h-6;

  &:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .link:hover {
    @apply border-border-strong text-fg;
  }
}
</style>
