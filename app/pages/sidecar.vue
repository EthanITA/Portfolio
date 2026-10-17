<script setup lang="ts">
import { links } from "~/utils/site/links";
import { seo } from "~/utils/site/seo";
import type { Beat } from "~/utils/site/text";

const { title, description } = seo.sidecar;

useSeoMeta({ title, description });
defineOgImage("Card", { title, sub: "A companion window for Claude Code." });
useSchemaOrg([
  defineSoftwareApp({
    name: title,
    description,
    applicationCategory: "DeveloperApplication",
    author: { "@id": links.identity },
  }),
]);

const beats: Beat[] = [
  {
    title: "Review",
    glyph: "review",
    text: [
      "Approve or reject a line, a hunk, a file or a whole folder. Claude hears about every reject, and ",
      { code: "⌘Z" },
      " takes back your last 50 decisions.",
    ],
  },
  {
    title: "Comments",
    glyph: "comments",
    text: ["Select anything on a page Claude built and leave a note. Send it, and it reaches the conversation as your own message."],
  },
  {
    title: "Follows you",
    glyph: "follows",
    text: ["Switch terminal tab or start typing in another session, and Sidecar moves there with you."],
  },
];
</script>

<template>
  <SiteProduct
    slug="sidecar"
    name="Sidecar"
    sub="A companion window for Claude Code."
    :lead="[
      'Sidecar sits next to Claude Code and follows the conversation you\'re in. You review what Claude changed, line by line, and when you comment on a page it built, the comment lands back in the conversation.',
    ]"
    :beats="beats"
    built-with="Nuxt and a small local server, wired into Claude Code through hooks. Before Claude's first edit to a file, a hook keeps what the file held, so every change can be reviewed and undone."
  />
</template>
