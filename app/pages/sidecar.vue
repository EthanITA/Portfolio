<script setup lang="ts">
import type { Beat } from "~/utils/site/text";

const description =
  "Sidecar is a companion window for Claude Code. Review every change line by line and send comments back into the conversation.";

useSeoMeta({ title: "Sidecar", description });
useSchemaOrg([
  defineSoftwareApp({
    name: "Sidecar",
    description,
    applicationCategory: "DeveloperApplication",
    author: { "@id": "#identity" },
  }),
]);

const beats: Beat[] = [
  {
    title: "Review",
    text: [
      "Approve or reject a line, a hunk, a file or a whole folder. Claude hears about every reject, and ",
      { code: "⌘Z" },
      " takes back your last 50 decisions.",
    ],
  },
  {
    title: "Comments",
    text: ["Select anything on a page Claude built and leave a note. Send it, and it reaches the conversation as your own message."],
  },
  {
    title: "Follows you",
    text: ["Switch terminal tab or start typing in another session, and Sidecar moves there with you."],
  },
];
</script>

<template>
  <SiteProduct
    name="Sidecar"
    sub="A companion window for Claude Code."
    :lead="[
      'Sidecar sits next to Claude Code and follows the conversation you\'re in. You review what Claude changed, line by line, and when you comment on a page it built, the comment lands back in the conversation.',
    ]"
    :beats="beats"
    built-with="Nuxt and a small local server, wired into Claude Code through hooks. Before Claude's first edit to a file, a hook keeps what the file held, so every change can be reviewed and undone."
    status="In progress, not released yet."
  >
    <LazyPlaySidecar />
  </SiteProduct>
</template>
