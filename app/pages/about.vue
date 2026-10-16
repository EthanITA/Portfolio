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
  { when: "2022", what: "Started freelancing. Seven engagements since, each run from the first call to the invoice." },
  { when: "2023", what: "Full stack engineer on Onesait Platform at Indra, a B2B product for Italian energy companies." },
  { when: "2023", what: "Twilight, a demand test with paid ads: 979 visitors and 113 leads." },
  { when: "2024", what: "MBA at Bologna Business School, and Startup Geeks." },
  { when: "2024", what: "LexSA, an AI assistant for tax professionals, built alone end to end." },
  { when: "2025", what: "Software engineer at Klarna." },
  { when: "2026", what: "AI product engineer at Moneyfarm, and Cela: Sidecar, Sage and AI Shell." },
];

const facts = ["Based in Milan", "Italian native, English at work"];
</script>

<template>
  <div class="about">
    <header class="head wrap">
      <h1 v-enter.now.words class="title">I don't know what I don't know, so I go and find out.</h1>
      <p v-enter.now="320" class="intro">I studied computer science in Bologna and later took an MBA, because I want to build a business and not only the software inside it. Agents write a lot of my code now. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
    </header>

    <SiteTimeline class="wrap" :items="timeline" />

    <ul class="facts wrap">
      <li v-for="fact in facts" :key="fact" v-enter.stagger class="chip-look">{{ fact }}</li>
    </ul>
  </div>
</template>

<style scoped>
.about {
  @apply flex flex-col gap-20 pt-8 sm:pt-16;
}

.head {
  @apply flex flex-col gap-6;
}

.title {
  @apply m-0 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl;
}

.intro {
  @apply typo-body-lg max-w-2xl text-muted;
}

.facts {
  @apply m-0 flex list-none flex-wrap gap-2 p-0;
}
</style>
