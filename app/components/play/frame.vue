<script setup lang="ts">
import type { SceneMode } from "#shared/types/seekable";
import type { ComponentPublicInstance } from "vue";
import type { Driver } from "~/utils/play/reel";

import { Surface } from "@cela/design";
import { useInvite } from "~/utils/play/invite";

const { mode, label, driver, inviteAt = "bottom" } = defineProps<{ mode: SceneMode; label: string; driver: Driver; inviteAt?: "top" | "bottom" }>();

const emit = defineEmits<{ take: []; key: [event: KeyboardEvent]; keyup: [event: KeyboardEvent]; leave: [] }>();

const visible = defineModel<boolean>("visible", { default: false });

const surface = useTemplateRef<ComponentPublicInstance>("frame");
const frameEl = (): HTMLElement | undefined => {
  const el: unknown = surface.value?.$el;
  return el instanceof HTMLElement ? el : undefined;
};

const invite = useInvite();
const inviting = computed(() => driver === "demo" && !invite.seen.value);

watch(
  () => driver,
  (next) => {
    if (next === "visitor") invite.dismiss();
  },
);

const PASSIVE_KEYS = new Set(["Tab", "Shift", "Meta", "Control", "Alt", "CapsLock", "Escape"]);

const onKeyDown = (event: KeyboardEvent): void => {
  if (driver === "demo" && !PASSIVE_KEYS.has(event.key) && !event.metaKey) emit("take");
  emit("key", event);
  if (event.key === "Escape" && !event.defaultPrevented) frameEl()?.blur();
};

const onFocusOut = (event: FocusEvent): void => {
  if (event.relatedTarget instanceof Node && frameEl()?.contains(event.relatedTarget)) return;
  emit("leave");
};

onMounted(() => {
  const el = frameEl();
  if (mode === "film" || !el) return;
  let inView = false;
  const update = (): void => {
    visible.value = inView && document.visibilityState === "visible";
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = !!entry && entry.isIntersecting && entry.intersectionRatio >= 0.5;
      update();
    },
    { threshold: [0, 0.5, 1] },
  );
  observer.observe(el);
  document.addEventListener("visibilitychange", update);
  onBeforeUnmount(() => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
  });
});
</script>

<template>
  <Surface v-if="mode === 'film'" class="play-frame" :data-mode="mode" pad="none" shape="island" variant="sunken">
    <slot />
  </Surface>
  <Surface
    v-else
    ref="frame"
    :aria-label="label"
    class="play-frame"
    :data-driver="driver"
    :data-mode="mode"
    pad="none"
    role="group"
    shape="island"
    tabindex="0"
    variant="sunken"
    @focusout="onFocusOut"
    @keydown="onKeyDown"
    @keyup="emit('keyup', $event)"
    @pointerdown.capture="emit('take')"
  >
    <slot />
    <Transition name="invite">
      <p v-if="inviting" class="invite" :data-at="inviteAt" data-invite>
        <span class="fine">This is live. Click in, it's yours.</span>
        <span class="coarse">Tap in, it's yours.</span>
      </p>
    </Transition>
  </Surface>
</template>

<style scoped>
.play-frame {
  @apply relative size-full overflow-hidden;
}

.play-frame[data-mode="live"]:focus-visible {
  @apply focus-ring;
}

/* A toy sets --invite-inset to clear what it keeps at that edge. */
.invite {
  @apply surface-glass pointer-events-none absolute inset-x-0 z-20 mx-auto my-0 flex h-9 w-fit items-center rounded-full px-4 typo-caption-strong whitespace-nowrap text-fg shadow-lg;
  bottom: var(--invite-inset, --spacing(4));
}

.invite[data-at="top"] {
  top: var(--invite-inset, --spacing(4));
  bottom: auto;
}

.invite .coarse {
  @apply hidden;
}

@media (pointer: coarse) {
  .invite .fine {
    @apply hidden;
  }

  .invite .coarse {
    @apply inline;
  }
}

.invite-enter-active,
.invite-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    translate var(--duration-base) var(--ease-out);
}

.invite-enter-from,
.invite-leave-to {
  opacity: 0;
  translate: 0 6px;
}

.invite[data-at="top"].invite-enter-from,
.invite[data-at="top"].invite-leave-to {
  translate: 0 -6px;
}

@media (prefers-reduced-motion: reduce) {
  .invite-enter-active,
  .invite-leave-active {
    transition: none;
  }
}
</style>
