<script setup lang="ts">
import { Surface } from "@cela/design";

import { links } from "~/utils/site/links";
import { seo } from "~/utils/site/seo";
import type { Run } from "~/utils/site/text";

type Flagship = { slug: "sidecar" | "sage" | "shell"; name: string; text: Run[]; status: string; to: string; link: string };
type Work = { name: string; text: string; number?: string; label: string };

useHead({ titleTemplate: "%s" });
useSeoMeta({ title: seo.home.title, description: seo.home.description });
useSchemaOrg([defineWebPage({ "@type": "ProfilePage", mainEntity: { "@id": links.identity } })]);
defineOgImage("Card", {
  title: "I build AI products end to end.",
  sub: "The agents write a lot of the code, and the standard is mine.",
});

const beats = ["Agents do the work.", "Every step, up to the click you can't take back.", "That click stays yours."];

const flagships: Flagship[] = [
  {
    slug: "sidecar",
    name: "Sidecar",
    text: ["Sidecar sits next to Claude Code. You review what it changed, line by line, and when you comment on a page it built, the comment lands back in the conversation."],
    status: "In progress",
    to: "/sidecar",
    link: "See Sidecar",
  },
  {
    slug: "sage",
    name: "Sage",
    text: ["A Mac assistant in the notch. Hold a key, say what you want in English, Italian or Chinese, and it does the steps, asking before anything it can't undo."],
    status: "Built, not shipped yet",
    to: "/sage",
    link: "See Sage",
  },
  {
    slug: "shell",
    name: "AI Shell",
    text: [
      "Type ",
      { code: "?" },
      " and say what you want. It writes the shell command, runs it when it only looks, and stops with a note before anything that deletes, overwrites or sends data off the machine.",
    ],
    status: "In daily use",
    to: "/shell",
    link: "See AI Shell",
  },
];

const tiers = ["Runs", "Waits for you", "Stops at the line"];

const work: Work[] = [
  { name: "Klarna", text: "Software engineer on the Klarna app.", number: "100M+", label: "monthly active users" },
  {
    name: "Moneyfarm",
    text: "A customer-facing LLM agent inside a regulated wealth manager, and the evals that decide whether it's safe to release.",
    label: "Since July 2026",
  },
  {
    name: "LexSA",
    text: "An AI assistant for tax professionals that I built alone end to end, from retrieval and agents down to Cloudflare and the database.",
    number: "272 of 272",
    label: "commits are mine",
  },
  {
    name: "Intellectual.AI",
    text: "A custom GPT that strangers keep using. Once #16 in Education.",
    number: "200K+",
    label: "conversations, 4.5 stars from 90+ ratings",
  },
  { name: "Twilight", text: "A demand test before building anything: 979 visitors and 113 leads.", number: "11.5%", label: "conversion" },
  {
    name: "Freelance",
    text: "Seven engagements since 2022, for two individuals, four SMEs and one corporate, each run from the first call to the invoice.",
    number: "7",
    label: "engagements",
  },
];
</script>

<template>
  <div class="home">
    <section class="hero wrap">
      <div class="intro">
        <h1 class="title">
          <span>I build AI products end to end.</span>
          <span class="second">The agents write a lot of the code, and the standard is mine.</span>
        </h1>
        <p class="roles">Software engineer at Klarna, AI product engineer at Moneyfarm, and founder of Cela, where I'm building Sidecar, Sage and AI Shell.</p>
        <div class="actions">
          <a class="btn btn-primary" href="#sequence">See the work</a>
          <NuxtLink class="btn btn-outline" to="/cv">Read the CV</NuxtLink>
        </div>
      </div>
      <SiteMount name="hero">
        <LazyStageHero />
      </SiteMount>
    </section>

    <ScrollSequence id="sequence" :beats="beats" closing="Three products, one rule." />

    <section class="flagships wrap" aria-label="Sidecar, Sage and AI Shell">
      <Surface v-for="item in flagships" :key="item.slug" as="article" class="flagship" :data-flagship="item.slug">
        <h2 class="name">{{ item.name }}</h2>
        <p class="text"><SiteRuns :runs="item.text" /></p>
        <span class="status">{{ item.status }}</span>
        <NuxtLink class="more" :to="item.to">{{ item.link }}</NuxtLink>
      </Surface>
    </section>

    <div class="plays wrap">
      <SiteMount name="play">
        <LazyPlaySidecar />
      </SiteMount>
      <SiteMount name="play">
        <LazyPlaySage />
      </SiteMount>
      <SiteMount name="play">
        <LazyPlayShell />
      </SiteMount>
    </div>

    <section class="line wrap" aria-labelledby="line-title">
      <h2 id="line-title" class="heading">One rule runs through all three.</h2>
      <p class="body">A step that only looks runs by itself. A step that changes something waits for you. A step you can't take back stops at the line, and the click is yours.</p>
      <ul class="tiers">
        <li v-for="tier in tiers" :key="tier">{{ tier }}</li>
      </ul>
      <SiteMount name="line">
        <LazyStageLine />
      </SiteMount>
      <p class="small">A toy version that matches words. Sage and AI Shell ask a separate model to rate every step, never the one that wrote it.</p>
    </section>

    <section class="work wrap" aria-labelledby="work-title">
      <h2 id="work-title" class="heading">Work</h2>
      <ul class="entries">
        <Surface v-for="entry in work" :key="entry.name" as="li" variant="flat" class="entry">
          <h3 class="name">{{ entry.name }}</h3>
          <p class="text">{{ entry.text }}</p>
          <p class="figure">
            <span v-if="entry.number" class="number">{{ entry.number }}</span>
            <span class="label">{{ entry.label }}</span>
          </p>
        </Surface>
      </ul>
    </section>

    <section class="standard wrap" aria-labelledby="standard-title">
      <h2 id="standard-title" class="heading">How I work</h2>
      <p class="body">Agents write a lot of my code. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
      <NuxtLink class="more" to="/how">Read the rules</NuxtLink>
    </section>

    <section class="contact wrap" aria-labelledby="contact-title">
      <h2 id="contact-title" class="heading">Contact</h2>
      <p class="body">LinkedIn is the fastest way to reach me. Email works too.</p>
      <ul class="links">
        <li><a :href="links.linkedin" rel="me noopener" target="_blank">LinkedIn</a></li>
        <li><SiteEmail /></li>
        <li><a :href="links.github" rel="me noopener" target="_blank">GitHub</a></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home {
  @apply flex flex-col gap-24 pt-8 sm:pt-16;
}

.hero {
  @apply flex flex-col gap-10;
}

.intro {
  @apply flex flex-col gap-6;
}

.title {
  @apply m-0 flex flex-col gap-2 text-4xl font-bold tracking-tight text-balance sm:text-6xl;
}

.second {
  @apply text-muted;
}

.roles {
  @apply typo-body-lg max-w-2xl text-muted;
}

.actions {
  @apply flex flex-wrap gap-3;
}

.flagships {
  @apply grid gap-4 md:grid-cols-3;
}

.flagship {
  @apply flex flex-col gap-3;
}

.name {
  @apply typo-heading-lg m-0;
}

.text {
  @apply typo-body-md text-muted;
}

.status {
  @apply typo-caption-medium w-fit rounded-full bg-primary-soft px-2.5 py-1 text-primary;
}

.more {
  @apply typo-body-strong mt-auto w-fit text-primary underline-offset-4;

  &:focus-visible {
    @apply focus-ring;
  }
}

.plays {
  @apply flex flex-col gap-10;
}

.line,
.work,
.standard,
.contact {
  @apply flex flex-col gap-6;
}

.heading {
  @apply typo-display m-0 sm:text-4xl;
}

.body {
  @apply typo-body-lg max-w-2xl text-muted;
}

.tiers {
  @apply m-0 flex list-none flex-wrap gap-2 p-0;

  & li {
    @apply typo-caption-medium rounded-full border border-border px-3 py-1;
  }
}

.small {
  @apply typo-caption max-w-xl text-subtle;
}

.entries {
  @apply m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3;
}

.entry {
  @apply flex flex-col gap-3;
}

.figure {
  @apply mt-auto flex flex-col;
}

.number {
  @apply font-mono text-3xl font-medium tracking-tight tabular-nums;
}

.label {
  @apply typo-caption text-muted;
}

.links {
  @apply m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0;

  & a {
    @apply typo-body-strong text-primary underline-offset-4;
  }

  & a:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .more:hover,
  .links a:hover {
    @apply underline;
  }
}
</style>
