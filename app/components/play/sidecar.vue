<script setup lang="ts">
import type { SceneMode, Seekable } from "#shared/types/seekable";

const { mode = "live" } = defineProps<{ mode?: SceneMode }>();

defineExpose<Seekable>({ duration: 0, seek: () => {} });
</script>

<template>
  <div :data-mode="mode">PlaySidecar</div>
</template>
