<script setup lang="ts">
import { cv } from "~/utils/site/cv";
import { links } from "~/utils/site/links";
import { seo } from "~/utils/site/seo";

useSeoMeta({ title: seo.cv.title, description: seo.cv.description });
defineOgImage("Card", { title: seo.cv.title, sub: cv.headline });

const side = [
  { title: "Selected work", entries: cv.work },
  { title: "Education", entries: cv.education },
];

</script>

<template>
  <div class="page">
    <div class="tools">
      <a v-enter.now v-press class="btn btn-primary download" href="/marco-dong-cv.pdf" download>Download PDF</a>
    </div>

    <article class="sheet">
      <header v-enter.now="60" class="masthead">
        <h1 class="name">{{ cv.name }}</h1>
        <p class="headline">{{ cv.headline }}</p>
        <ul class="contact">
          <li>{{ cv.location }}</li>
          <li><SiteEmail reveal /></li>
          <li><a :href="links.site">madong.me</a></li>
          <li><a :href="links.github">github.com/EthanITA</a></li>
          <li><a :href="links.linkedin">linkedin.com/in/marcodong-838453</a></li>
        </ul>
      </header>

      <p v-enter.now="120" class="profile"><SiteRuns :runs="cv.profile" /></p>

      <div class="cols">
        <section v-enter.now="180" class="section" data-area="experience">
          <h2 class="heading">Experience</h2>
          <SiteCvEntry v-for="entry in cv.experience" :key="entry.title + entry.org" :entry="entry" />
        </section>

        <div class="side">
          <section v-for="section in side" :key="section.title" v-enter.now.stagger="240" class="section">
            <h2 class="heading">{{ section.title }}</h2>
            <SiteCvEntry v-for="entry in section.entries" :key="entry.title + entry.org" :entry="entry" />
          </section>
        </div>

        <section v-enter.now="360" class="section" data-area="skills">
          <h2 class="heading">Skills</h2>
          <dl class="skills">
            <div v-for="skill in cv.skills" :key="skill.group" class="skill">
              <dt class="group">{{ skill.group }}</dt>
              <dd class="items">
                <SiteCvTags :items="skill.items" />
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </article>
  </div>
</template>

<style scoped>
.page {
  @apply flex flex-col gap-6 px-3 py-8 sm:px-5 sm:pt-12 print:p-0;
}

.tools {
  @apply mx-auto flex w-full max-w-200 justify-end print:hidden;
}

.sheet {
  @apply surface-raised mx-auto flex w-full max-w-200 flex-col gap-5 p-5 sm:p-10;
  @apply print:max-w-none print:gap-3 print:rounded-none print:border-0 print:p-0 print:shadow-none;
}

.masthead {
  @apply flex flex-col gap-1;
}

.name {
  @apply m-0 text-4xl font-bold tracking-tight print:text-3xl;
}

.headline {
  @apply typo-heading text-primary;
}

.contact {
  @apply typo-mono-meta m-0 mt-2 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-muted print:mt-1 print:leading-snug;

  & a {
    @apply inline-flex min-h-6 items-center text-inherit no-underline print:min-h-0;
  }

  & a:focus-visible {
    @apply focus-ring;
  }
}

.profile {
  @apply typo-body-md border-t border-border pt-4 text-fg print:typo-caption print:pt-3 print:leading-snug;
}

.cols {
  @apply grid gap-8 print:gap-x-6 print:gap-y-4;
  grid-template-areas: "experience" "side" "skills";

  @media (width >= 48rem) {
    grid-template-areas: "experience side" "experience skills";
    grid-template-columns: 1.42fr 1fr;
    grid-template-rows: auto 1fr;
  }

  @media print {
    grid-template-areas: "experience side" "skills skills";
    grid-template-columns: 1.75fr 1fr;
    grid-template-rows: auto auto;
  }
}

.side {
  @apply flex flex-col gap-6 print:gap-4;
  grid-area: side;
}

.section {
  @apply flex flex-col gap-4 print:gap-2.5;

  &[data-area="experience"] {
    grid-area: experience;
  }

  &[data-area="skills"] {
    grid-area: skills;
  }
}

.heading {
  @apply typo-eyebrow m-0 flex flex-col gap-1.5 leading-snug text-muted;

  &::after {
    @apply block h-0.5 w-8 rounded-full bg-primary;
    content: "";
  }
}

.download {
  @apply min-h-11 px-5;
}

.skills {
  @apply m-0 flex flex-col gap-2.5 print:grid print:grid-cols-5 print:gap-4;
}

.skill {
  @apply flex flex-col gap-1 print:gap-0.5;
}

.group {
  @apply typo-eyebrow-sm leading-snug text-muted;
}

.items {
  @apply m-0;
}

@media (hover: hover) and (pointer: fine) {
  .contact a:hover {
    @apply text-primary;
  }
}

@page {
  size: A4;
  margin: 8mm 10mm;
}
</style>
