<script setup lang="ts">
import { links } from "~/utils/site/links";
import { seo } from "~/utils/site/seo";
import type { Beat } from "~/utils/site/text";

const { title, description } = seo.shell;

useSeoMeta({ title, description });
defineOgImage("Card", { title, sub: "Plain words in, a shell command out." });
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
    title: "Looks",
    glyph: "looks",
    text: ["A command that only reads runs straight away, the way it would if you'd typed it."],
  },
  {
    title: "Changes",
    glyph: "changes",
    text: ["One that deletes or overwrites lands on your line with a note saying what it would do, and waits for Enter."],
  },
  {
    title: "Can't be undone",
    glyph: "undone",
    text: ["One that's genuinely destructive explains itself and asks first. Saying yes only puts it on your line, so it takes two deliberate acts."],
  },
  {
    title: "One answer from a pipe",
    glyph: "pipe",
    text: [{ code: "ai -p" }, " works like ", { code: "claude -p" }, ". Pipe in a staged diff and get a commit message back."],
  },
];
</script>

<template>
  <SiteProduct
    slug="shell"
    name="AI Shell"
    sub="Plain words in, a shell command out."
    :lead="[
      'Type ',
      { code: '?' },
      ' and say what you want in ordinary words. AI Shell writes the command, and how much happens by itself depends on what the command would do.',
    ]"
    :beats="beats"
    built-with="TypeScript for the model calls and a small zsh widget for the Enter key. A separate model rates every command before you see it, so whether a command is dangerous is never a question put to the model that wrote it. The bundle has no dependencies and starts in about 25 milliseconds."
    limit="It's a seatbelt, not a locked door. Read what lands on your line."
  />
</template>
