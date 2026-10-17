<script setup lang="ts">
import type { FilmScript } from "~~/films/scripts/script";

const { script } = defineProps<{ script: FilmScript }>();
</script>

<template>
  <FilmFrame>
    <FilmIsland :shots="script.island" />
    <FilmWindow :at="script.rig.at" :until="script.rig.until">
      <FilmRig :shots="script.rig.shots" :at="script.rig.at" :until="script.rig.until">
        <slot />
        <FilmRule v-for="rule in script.rules" :key="rule.at" :anchor="rule.anchor" :at="rule.at" />
      </FilmRig>
    </FilmWindow>
    <FilmLine :script="script" />
    <FilmSky :script="script" />
    <FilmTitle :text="script.title.text" :at="script.title.at" :until="script.title.until" :tone="script.title.tone" />
    <FilmEnd :at="script.end.at">{{ script.end.text }}</FilmEnd>
  </FilmFrame>
</template>
