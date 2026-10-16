<script setup lang="ts">
import { links } from "~/utils/site/links";
import { seo } from "~/utils/site/seo";
import type { Beat } from "~/utils/site/text";

const { title, description } = seo.sage;

useSeoMeta({ title, description });
defineOgImage("Card", { title, sub: "A Mac assistant in the notch." });
useSchemaOrg([
  defineSoftwareApp({
    name: title,
    description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "macOS",
    author: { "@id": links.identity },
  }),
]);

const beats: Beat[] = [
  {
    title: "Hold to talk",
    glyph: "talk",
    text: ["Hold right Option and talk. Your words show up live on the island, in English, Italian or Chinese."],
  },
  {
    title: "Steps you can watch",
    glyph: "steps",
    text: ['Say "I want to join the standup" and it finds the event, opens the call and turns your mic and camera off, ticking each step.'],
  },
  {
    title: "Asks first",
    glyph: "asks",
    text: [
      "A step that changes something shows its question and a line that fills over five seconds. A step others would see, that moves money or can't be undone, waits for your yes.",
    ],
  },
  {
    title: "Hands it back",
    glyph: "hands",
    text: ['A Pay or Send button is never pressed for you. Sage outlines it and hands it back: "Stopped at Pay. It\'s yours to press."'],
  },
];
</script>

<template>
  <SiteProduct
    slug="sage"
    name="Sage"
    sub="A Mac assistant in the notch."
    :lead="[
      'Hold a key, say what you want, let go. Sage works out what you meant, does the steps one after another, and ticks each one on the island as it finishes.',
    ]"
    :beats="beats"
    built-with="A native Swift app for the island and the keys, and a Nuxt server that plans each step with Claude. A separate classifier model rates every step before it runs."
    status="In progress. It runs on my Mac today and ships once it's signed with an Apple Developer ID."
  >
    <LazyPlaySage />
  </SiteProduct>
</template>
