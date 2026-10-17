<script setup lang="ts">
import { type JSAnimation, animate } from "animejs";

import { links } from "~/utils/site/links";
import { motionOn } from "~/utils/site/motion";
import { flagships } from "~/utils/site/products";
import { seo } from "~/utils/site/seo";
import { PHONE_REST_BAND, WIDE_REST_LEFT } from "~/utils/stage/camera";

type Count = { to: number; after?: string; decimals?: number };
type Measure = { share: number; caption?: string };
type Work = { name: string; text: string; count?: Count; total?: number; label: string; measure?: Measure };

const DRIFT = 0.3;

definePageMeta({ endsOnContact: true });
useHead({ titleTemplate: "%s" });
useSeoMeta({ title: seo.home.title, description: seo.home.description });
useSchemaOrg([defineWebPage({ "@type": "ProfilePage", mainEntity: { "@id": links.identity } })]);
defineOgImage("Card", {
  title: "I build AI products end to end.",
  sub: "The agents write a lot of the code, and the standard is mine.",
});

const beats = ["Agents do the work.", "Every step, up to the click you can't take back.", "That click stays yours."];

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
    count: { to: 272 },
    total: 272,
    label: "commits are mine",
    measure: { share: 1 },
  },
  {
    name: "Intellectual.AI",
    text: "A custom GPT that strangers keep using. Once #16 in Education.",
    count: { to: 200, after: "K+" },
    label: "conversations",
    // The rating gets its own bar, so 200K+ stays a count instead of reading as 90 percent of something.
    measure: { share: 0.9, caption: "4.5 stars from 90+ ratings" },
  },
  {
    name: "Twilight",
    text: "A demand test before building anything: 979 visitors and 113 leads.",
    count: { to: 11.5, after: "%", decimals: 1 },
    label: "conversion",
    measure: { share: 0.115 },
  },
  {
    name: "Freelance",
    text: "Seven engagements since 2022, for two individuals, four SMEs and one corporate, each run from the first call to the invoice.",
    count: { to: 7 },
    label: "engagements",
  },
];

const counting = reactive(new Set<string>());

const hero = useTemplateRef<HTMLElement>("hero");
const intro = useTemplateRef<HTMLElement>("intro");
const heroProgress = ref(0);
let drift: JSAnimation | undefined;
let resize: ResizeObserver | undefined;
let heroTop = 0;
let heroHeight = 0;

// A global smooth scroll-behavior would also animate the router's back and forward restores across the whole page.
const toWork = (event: MouseEvent): void => {
  const target = document.getElementById("sequence");
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: motionOn() ? "smooth" : "instant" });
};

// Unsmoothed, so progress 1 lands exactly where the sequence pins on the same image.
const follow = (): void => {
  if (!heroHeight) return;
  const progress = Math.min(1, Math.max(0, (scrollY - heroTop) / heroHeight));
  heroProgress.value = progress;
  drift?.seek(progress * drift.duration);
};

const measure = (): void => {
  if (!hero.value) return;
  const box = hero.value.getBoundingClientRect();
  heroTop = box.top + scrollY;
  heroHeight = box.height;
  follow();
};

onMounted(() => {
  if (!hero.value || !intro.value || !motionOn()) return;
  drift = animate(intro.value, {
    ease: "linear",
    translateY: [0, -hero.value.offsetHeight * DRIFT],
    autoplay: false,
  });
  measure();
  resize = new ResizeObserver(measure);
  resize.observe(hero.value);
  resize.observe(document.documentElement);
  addEventListener("scroll", follow, { passive: true });
});

onBeforeUnmount(() => {
  removeEventListener("scroll", follow);
  resize?.disconnect();
  drift?.revert();
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
      <section ref="hero" class="hero" :style="{ '--island-bottom': PHONE_REST_BAND.bottom, '--island-left': WIDE_REST_LEFT }">
        <div ref="intro" class="intro">
          <h1 class="title">
            <span v-enter.now.words.wide class="first">I build AI products end to end.</span>
            <span v-enter.now.wide="200" class="second"><span class="clause">The agents write a lot of the code,</span> <span class="clause">and the standard is mine.</span></span>
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
      <p v-enter class="body">One checkable number per line.</p>
      <ul class="entries">
        <li v-for="entry in work" :key="entry.name" v-enter.stagger class="entry">
          <p class="figure">
            <span v-if="entry.count" class="number">
              <SiteCount v-bind="entry.count" @start="counting.add(entry.name)" /><span v-if="entry.total" class="total"> of {{ entry.total }}</span>
            </span>
            <span v-else class="since">{{ entry.label }}</span>
            <span v-if="entry.count" class="label">{{ entry.label }}</span>
          </p>
          <div v-if="entry.measure" class="measure">
            <span v-if="entry.measure.caption" class="label">{{ entry.measure.caption }}</span>
            <SiteMeasure :share="entry.measure.share" :play="counting.has(entry.name)" />
          </div>
          <h3 class="name">{{ entry.name }}</h3>
          <p class="text">{{ entry.text }}</p>
        </li>
      </ul>
    </section>

    <section class="standard wrap" aria-labelledby="standard-title">
      <div class="story">
        <h2 id="standard-title" v-enter.words class="heading">How I work</h2>
        <p v-enter class="body">Agents write a lot of my code. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>
        <span v-enter.line class="rule" aria-hidden="true" />
        <NuxtLink v-enter class="more" to="/how">
          Read the rules
          <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </NuxtLink>
      </div>
      <SiteBoard />
    </section>

    <section class="contact" aria-labelledby="contact-title">
      <span v-enter.line class="edge" aria-hidden="true" />
      <div class="wrap band">
        <h2 id="contact-title" v-enter.words class="heading">Contact</h2>
        <p v-enter class="body">LinkedIn is the fastest way to reach me. Email works too.</p>
        <ul class="cards">
          <li v-enter.stagger><SiteContactCard name="LinkedIn" handle="linkedin.com/in/marcodong-838453" :href="links.linkedin" /></li>
          <li v-enter.stagger><SiteContactCard name="GitHub" handle="github.com/EthanITA" :href="links.github" /></li>
          <li v-enter.stagger><SiteContactCard name="Email" email /></li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  @apply flex flex-col gap-16 sm:gap-24;
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

/* Under lg the text stays at least 8 px under stage's island rest band, so the hero grows rather than overlap. */
.hero {
  @apply @container relative flex min-h-160 flex-col justify-end overflow-hidden pb-16 max-lg:min-h-svh max-lg:pt-[max(13rem,calc(var(--island-bottom)*100svh_+_0.5rem))] max-lg:short:pb-10 md:max-lg:justify-center lg:h-svh lg:justify-center lg:pt-20 lg:pb-0;
}

.intro {
  @apply relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 max-lg:short:gap-4 sm:px-8;
}

.title {
  @apply m-0 flex max-w-4xl flex-col gap-2 text-4xl font-bold tracking-tight text-balance max-lg:short:text-3xl xl:text-5xl;
}

/* From lg the island's left cap sits at a fixed share of the hero's width, so the H1 stops one gutter short of it. */
@variant lg {
  .title {
    max-width: min(var(--container-4xl), calc(var(--island-left) * 100cqw - --spacing(8) - max(--spacing(8), (100cqw - var(--container-7xl)) / 2 + --spacing(8))));
  }
}

.second {
  @apply text-muted;
}

.clause {
  @apply lg:block;
}

.roles {
  @apply typo-body-lg max-w-prose text-pretty text-muted max-lg:short:typo-body;
}

.actions {
  @apply flex flex-col gap-3 max-lg:short:flex-row sm:flex-row;
}

.action {
  @apply min-h-11 justify-center px-5;
}

.flagships {
  @apply relative grid gap-4 md:grid-cols-3;
}

.line,
.work,
.story,
.band {
  @apply flex flex-col gap-6;
}

.heading {
  @apply typo-display m-0 text-balance sm:text-4xl;
}

.body {
  @apply typo-body-lg max-w-prose text-pretty text-muted;
}

.small {
  @apply typo-caption max-w-prose text-muted;
}

/* The bleed lines the text up with the heading, and the clip drops the hairlines cells draw past the edge. */
.entries {
  @apply m-0 -mx-5 grid list-none gap-px overflow-hidden border-y border-border p-0 sm:-mx-6 sm:grid-cols-2 lg:grid-cols-3;
}

/* Subgrid keeps numbers, bars and names level across a row when only some cells have a bar. */
.entry {
  @apply row-span-4 grid grid-rows-subgrid gap-y-0 px-5 py-8 shadow-[1px_0_var(--color-border),0_1px_var(--color-border)] sm:px-6;
}

.figure {
  @apply row-start-1 m-0 flex flex-col gap-2;
}

.number {
  @apply numeral;
}

/* "272 of 272" at the number's size needs 346 px against a 277 px cell at lg, so the total steps down. */
.total {
  @apply text-3xl;
}

.since {
  @apply font-mono text-3xl font-medium tracking-tight whitespace-nowrap;
}

.label {
  @apply typo-caption text-muted;
}

.measure {
  @apply row-start-2 flex flex-col gap-2 pt-4;
}

.name {
  @apply typo-heading-lg row-start-3 m-0 pt-6;
}

.text {
  @apply typo-body row-start-4 m-0 pt-2 text-muted;
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

.standard {
  @apply grid items-center gap-10 md:grid-cols-2;
}

.contact {
  @apply relative bg-sunken;
}

.edge {
  @apply absolute inset-x-0 top-0 h-px origin-left bg-primary;
}

.band {
  @apply py-14;
}

.cards {
  @apply m-0 grid list-none gap-3 p-0 sm:grid-cols-3;
}

@media (hover: hover) and (pointer: fine) {
  .more:hover .arrow {
    @apply translate-x-1;
  }
}
</style>
