<script setup lang="ts">
import { Surface } from "@cela/design";
import { type JSAnimation, type ScrollObserver, animate, onScroll } from "animejs";

import type { Product } from "~/utils/site/films";
import { links } from "~/utils/site/links";
import { motionOn } from "~/utils/site/motion";
import { seo } from "~/utils/site/seo";
import type { Run } from "~/utils/site/text";

type Flagship = { slug: Product; name: string; text: Run[]; status: string; to: string; link: string };
type Count = { to: number; after?: string; decimals?: number };
type Work = { name: string; text: string; count?: Count; label: string };

const DRIFT = 0.3;
const DRIFT_OPACITY = 0.4;

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

const work: Work[] = [
  { name: "Klarna", text: "Software engineer on the Klarna app.", count: { to: 100, after: "M+" }, label: "monthly active users" },
  {
    name: "Moneyfarm",
    text: "A customer-facing LLM agent inside a regulated wealth manager, and the evals that decide whether it's safe to release.",
    label: "Since July 2026",
  },
  {
    name: "LexSA",
    text: "An AI assistant for tax professionals that I built alone end to end, from retrieval and agents down to Cloudflare and the database.",
    count: { to: 272, after: " of 272" },
    label: "commits are mine",
  },
  {
    name: "Intellectual.AI",
    text: "A custom GPT that strangers keep using. Once #16 in Education.",
    count: { to: 200, after: "K+" },
    label: "conversations, 4.5 stars from 90+ ratings",
  },
  {
    name: "Twilight",
    text: "A demand test before building anything: 979 visitors and 113 leads.",
    count: { to: 11.5, after: "%", decimals: 1 },
    label: "conversion",
  },
  {
    name: "Freelance",
    text: "Seven engagements since 2022, for two individuals, four SMEs and one corporate, each run from the first call to the invoice.",
    count: { to: 7 },
    label: "engagements",
  },
];

const hero = useTemplateRef<HTMLElement>("hero");
const intro = useTemplateRef<HTMLElement>("intro");
const heroProgress = ref(0);
let drift: JSAnimation | undefined;
let scroller: ScrollObserver | undefined;

// A global smooth scroll-behavior would also animate the router's back and forward restores across the whole page.
const toWork = (event: MouseEvent): void => {
  const target = document.getElementById("sequence");
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: motionOn() ? "smooth" : "instant" });
};

onMounted(() => {
  if (!hero.value || !intro.value || !motionOn()) return;
  scroller = onScroll({
    target: hero.value,
    enter: "top top",
    leave: "top bottom",
    // Unsmoothed, so progress 1 lands exactly where the sequence pins on the same image.
    sync: true,
    onUpdate: (self) => (heroProgress.value = self.progress),
  });
  drift = animate(intro.value, {
    ease: "linear",
    opacity: [1, DRIFT_OPACITY],
    translateY: [0, -hero.value.offsetHeight * DRIFT],
    autoplay: scroller,
  });
});

onBeforeUnmount(() => {
  drift?.revert();
  scroller?.revert();
});
</script>

<template>
  <div class="home">
    <div class="opening">
      <div v-enter.now.wide.scale="150" class="holder">
        <SiteMount name="hero">
          <LazyStageHero :progress="heroProgress" />
        </SiteMount>
      </div>
      <section ref="hero" class="hero">
        <div ref="intro" class="intro">
          <h1 class="title">
            <span v-enter.now.words.wide class="first">I build AI products end to end.</span>
            <span v-enter.now.wide="200" class="second">The agents write a lot of the code, and the standard is mine.</span>
          </h1>
          <p v-enter.now="320" class="roles">Software engineer at Klarna, AI product engineer at Moneyfarm, and founder of Cela, where I'm building Sidecar, Sage and AI Shell.</p>
          <div class="actions">
            <a v-enter.now="420" v-press class="btn btn-primary action" href="#sequence" @click="toWork">See the work</a>
            <NuxtLink v-enter.now="480" v-press class="btn btn-outline action" to="/cv">Read the CV</NuxtLink>
          </div>
        </div>
      </section>

      <ScrollSequence id="sequence" :beats="beats" closing="Three products, one rule." />
    </div>

    <section class="flagships wrap" aria-label="Sidecar, Sage and AI Shell">
      <SiteFlagship v-for="item in flagships" :key="item.slug" v-bind="item" />
    </section>

    <SitePlaygrounds />

    <section class="line wrap" aria-labelledby="line-title">
      <h2 id="line-title" v-enter.words class="heading">One rule runs through all three.</h2>
      <p v-enter class="body">A step that only looks runs by itself. A step that changes something waits for you. A step you can't take back stops at the line, and the click is yours.</p>
      <SiteMount name="line">
        <LazyStageLine />
      </SiteMount>
      <p v-enter class="small">A toy version that matches words. Sage and AI Shell ask a separate model to rate every step, never the one that wrote it.</p>
    </section>

    <section class="work wrap" aria-labelledby="work-title">
      <h2 id="work-title" v-enter.words class="heading">Work</h2>
      <ul class="entries">
        <Surface v-for="entry in work" :key="entry.name" v-enter.stagger as="li" variant="flat" class="entry">
          <p class="figure">
            <SiteCount v-if="entry.count" class="number" v-bind="entry.count" />
            <span v-else class="number since">{{ entry.label }}</span>
            <span v-if="entry.count" class="label">{{ entry.label }}</span>
          </p>
          <h3 class="name">{{ entry.name }}</h3>
          <p class="text">{{ entry.text }}</p>
        </Surface>
      </ul>
    </section>

    <section class="standard wrap" aria-labelledby="standard-title">
      <h2 id="standard-title" v-enter.words class="heading">How I work</h2>
      <p v-enter class="body">Agents write a lot of my code. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
      <span v-enter.line class="rule" aria-hidden="true" />
      <NuxtLink v-enter class="more" to="/how">
        Read the rules
        <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </NuxtLink>
    </section>

    <section class="contact wrap" aria-labelledby="contact-title">
      <h2 id="contact-title" v-enter.words class="heading">Contact</h2>
      <p v-enter class="body">LinkedIn is the fastest way to reach me. Email works too.</p>
      <ul class="links">
        <li v-enter.stagger><a class="chip-look" :href="links.linkedin" rel="me noopener" target="_blank">LinkedIn</a></li>
        <li v-enter.stagger><a class="chip-look" :href="links.github" rel="me noopener" target="_blank">GitHub</a></li>
        <li v-enter.stagger><SiteEmail class="chip-look" /></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home {
  @apply flex flex-col gap-28;
}

.opening {
  @apply relative -mt-20;
}

.holder {
  @apply relative h-svh -mb-[100svh];
}

:root[data-motion="on"] .holder {
  @apply sticky top-0;
}

.hero {
  @apply relative flex h-svh min-h-160 flex-col justify-end overflow-hidden pt-20 pb-16 md:justify-center md:pb-0;
}

.intro {
  @apply relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 sm:px-8;
}

.title {
  @apply m-0 flex max-w-4xl flex-col gap-2 text-4xl font-bold tracking-tight lg:text-5xl 2xl:text-6xl;
}

.second {
  @apply text-muted;
}

.roles {
  @apply typo-body-lg max-w-xl text-muted;
}

.actions {
  @apply flex flex-col gap-3 sm:flex-row;
}

.action {
  @apply min-h-11 justify-center px-5;
}

.flagships {
  @apply relative grid gap-4 md:grid-cols-3;
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
  @apply flex flex-col gap-1;
}

.number {
  @apply font-mono text-5xl font-medium tracking-tight tabular-nums;
}

.since {
  @apply text-3xl;
}

.label {
  @apply typo-caption text-muted;
}

.name {
  @apply typo-heading-lg m-0 mt-2;
}

.text {
  @apply typo-body text-muted;
}

.rule {
  @apply block h-px w-40 origin-left bg-primary;
}

.more {
  @apply typo-body-strong inline-flex min-h-11 w-fit items-center gap-2 text-primary no-underline;

  &:focus-visible {
    @apply focus-ring;
  }
}

.arrow {
  @apply size-4 transition-transform duration-(--duration-snappy) ease-out;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.links {
  @apply m-0 flex list-none flex-wrap gap-2 p-0;

  & .chip-look {
    @apply min-h-11 px-3.5 transition-colors duration-(--duration-fast) ease-out;
  }

  & .chip-look:focus-visible {
    @apply focus-ring;
  }
}

@media (hover: hover) and (pointer: fine) {
  .more:hover .arrow {
    @apply translate-x-1;
  }

  .links .chip-look:hover {
    @apply border-border-strong text-fg;
  }
}
</style>
