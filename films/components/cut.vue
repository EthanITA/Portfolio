<script setup lang="ts">
import type { Cue, FilmScript } from "~~/films/scripts/script";

const { script, voice = [] } = defineProps<{ script: FilmScript; voice?: Cue[] }>();

const captions = computed(() => [...script.captions, ...voice]);

const presses = computed(() =>
  script.keys.map((press) => {
    const at = press.at - 200;
    const until = press.until ?? press.at + 1000;
    const beside = captions.value.find((caption) => caption.at < until && at < caption.until)?.at.toString();
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
    <FilmCaption v-for="caption in captions" :key="caption.at" :at="caption.at" :until="caption.until" :data-caption="caption.at">{{ caption.text }}</FilmCaption>
    <FilmKey v-for="press in presses" :key="press.at" :keys="press.keys" :at="press.at" :until="press.until" :beside="press.beside" />
    <FilmEnd :at="script.end.at">{{ script.end.text }}</FilmEnd>
  </FilmFrame>
</template>
