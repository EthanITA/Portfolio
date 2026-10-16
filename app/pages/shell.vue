<script setup lang="ts">
import type { Beat } from "~/utils/site/text";

const description =
  "AI Shell turns plain words into shell commands, runs the ones that only look, and stops before anything destructive.";

useSeoMeta({ title: "AI Shell", description });
useSchemaOrg([
  defineSoftwareApp({
    name: "AI Shell",
    description,
    applicationCategory: "DeveloperApplication",
    author: { "@id": "#identity" },
  }),
]);

const beats: Beat[] = [
  {
    title: "Looks",
    text: ["A command that only reads runs straight away, the way it would if you'd typed it."],
  },
  {
    title: "Changes",
    text: ["One that deletes or overwrites lands on your line with a note saying what it would do, and waits for Enter."],
  },
  {
    title: "Can't be undone",
    text: ["One that's genuinely destructive explains itself and asks first. Saying yes only puts it on your line, so it takes two deliberate acts."],
  },
  {
    title: "One answer from a pipe",
    text: [{ code: "ai -p" }, " works like ", { code: "claude -p" }, ". Pipe in a staged diff and get a commit message back."],
  },
];
</script>

<template>
  <SiteProduct
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
    status="In daily use, not published yet."
  >
    <LazyPlayShell />
  </SiteProduct>
</template>
