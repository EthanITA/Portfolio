<script setup lang="ts">
import { MOTION_DURATION } from "@cela/design/utils/motion";
import type { Cue, FilmScript } from "~~/films/scripts/script";

const { script, voice = [] } = defineProps<{ script: FilmScript; voice?: Cue[] }>();

const GAP = 200;

// Pills share one band, so each one is gone before the next arrives.
const captions = computed(() => {
  const all = [...voice].sort((a, b) => a.at - b.at);
  return all.map((caption, index) => {
    const next = all[index + 1];
    return next ? { ...caption, until: Math.min(caption.until, next.at - GAP) } : caption;
  });
});

const presses = computed(() =>
  script.keys.map((press) => {
    const at = press.at - 200;
    const until = press.until ?? press.at + 1000;
    // A caption leaving before the key has arrived would only make it jump, so the key lets it go.
    const beside = captions.value.filter((caption) => caption.at < until && at + MOTION_DURATION.base < caption.until);
    return { keys: press.key, at, until, beside };
  }),
);
</script>

<template>
  <FilmFrame>
    <FilmIsland :shots="script.island" />
    <FilmRig :shots="script.rig.shots" :at="script.rig.at" :until="script.rig.until">
      <slot />
      <FilmRule v-for="rule in script.rules" :key="rule.at" :anchor="rule.anchor" :at="rule.at" />
    </FilmRig>
    <FilmTitle :at="script.title.at" :until="script.title.until" :tone="script.title.tone">{{ script.title.text }}</FilmTitle>
    <FilmCaption v-for="caption in captions" :key="caption.at" :text="caption.text" :at="caption.at" :until="caption.until" :data-caption="caption.at" />
    <FilmKey v-for="press in presses" :key="press.at" :keys="press.keys" :at="press.at" :until="press.until" :beside="press.beside" />
    <FilmEnd :at="script.end.at">{{ script.end.text }}</FilmEnd>
  </FilmFrame>
</template>
