<script setup lang="ts">
import { Island, Surface, ThemeToggle } from "@cela/design";
import { type AnimatableObject, createAnimatable, spring, utils } from "animejs";

import { nav } from "~/utils/site/links";
import { SPRING, motionOn } from "~/utils/site/motion";

const IDLE = "Building Sidecar, Sage and AI Shell";
const LABEL_MS = 1200;
const FOLD_AT = 0.8;

const route = useRoute();
const folded = ref(false);
const menu = ref(false);
const focused = ref(false);
const label = ref<string>();
const tween = ref<"grow" | "fold">("grow");

const root = useTemplateRef<HTMLElement>("root");
const list = useTemplateRef<HTMLElement>("list");
const underline = useTemplateRef<HTMLElement>("underline");
const menuButton = useTemplateRef<HTMLButtonElement>("menuButton");

const open = computed(() => menu.value || !folded.value || focused.value);
const idle = computed(() => label.value ?? IDLE);

watch(open, (now) => (tween.value = now ? "grow" : "fold"));

let slide: AnimatableObject | undefined;
const place = (): void => {
  const bar = underline.value;
  const active = list.value?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!bar) return;
  bar.dataset.visible = String(!!active);
  if (!active) return;
  const to = { x: active.offsetLeft, scaleX: active.offsetWidth };
  if (!slide || !motionOn()) {
    utils.set(bar, to);
    slide ??= motionOn() ? createAnimatable(bar, { x: {}, scaleX: {}, ease: spring(SPRING.snappy) }) : undefined;
    return;
  }
  slide.x?.(to.x);
  slide.scaleX?.(to.scaleX);
};

let frame = 0;
const measure = (): void => {
  frame = 0;
  folded.value = window.scrollY > window.innerHeight * FOLD_AT;
};
const onScroll = (): void => {
  frame ||= requestAnimationFrame(measure);
};

let labelTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => route.path,
  (path) => {
    menu.value = false;
    label.value = nav.find((item) => item.to === path)?.label;
    clearTimeout(labelTimer);
    if (label.value) labelTimer = setTimeout(() => (label.value = undefined), LABEL_MS);
    void nextTick(place);
  },
);

const onFocusOut = (event: FocusEvent): void => {
  if (event.relatedTarget instanceof Node && root.value?.contains(event.relatedTarget)) return;
  focused.value = false;
};

const focusables = (): HTMLElement[] =>
  Array.from(root.value?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []).filter(
    (el) => !!el.offsetParent,
  );

const onKeydown = (event: KeyboardEvent): void => {
  if (!menu.value) return;
  if (event.key === "Escape") {
    menu.value = false;
    menuButton.value?.focus();
    return;
  }
  if (event.key !== "Tab") return;
  const items = focusables();
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
};

const onIslandOpen = (value: boolean): void => {
  if (!value) menu.value = false;
};

watch(underline, (el) => el && place());

onMounted(() => {
  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", place);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", place);
  cancelAnimationFrame(frame);
  clearTimeout(labelTimer);
  slide?.revert();
});
</script>

<template>
  <header ref="root" class="bar" :data-folded="folded" :data-menu="menu" :data-tween="tween">
    <!-- Island's responsive box renders a fragment on the server that hydration can't match, so it mounts in the browser. -->
    <ClientOnly>
      <Island
        v-slot="{ expanded }"
        class="pill"
        shape="pill"
        glass="liquid"
        inline
        :open="open"
        :hover="folded && !menu"
        :dismiss-on-outside-click="menu"
        @update:open="onIslandOpen"
      >
        <nav aria-label="Main" @focusin="focused = folded" @focusout="onFocusOut" @keydown="onKeydown">
          <div class="row">
            <NuxtLink class="mark" to="/">Marco Dong</NuxtLink>
            <span v-if="folded && !expanded && !menu" class="status">
              <span class="dot" aria-hidden="true" />
              <span v-fade="idle" class="idle">{{ idle }}</span>
            </span>
            <div class="wide">
              <div data-island-reveal>
                <div class="links">
                  <ul ref="list" class="items">
                    <li v-for="item in nav" :key="item.to">
                      <NuxtLink class="item" :to="item.to">{{ item.label }}</NuxtLink>
                    </li>
                  </ul>
                  <span ref="underline" class="underline" aria-hidden="true" />
                  <ThemeToggle data-tip="Light or dark" />
                </div>
              </div>
            </div>
            <button
              ref="menuButton"
              class="menu"
              type="button"
              :aria-expanded="menu"
              :aria-label="menu ? 'Close' : 'Menu'"
              @click="menu = !menu"
            >
              <span class="burger" :data-open="menu" aria-hidden="true" />
            </button>
          </div>
          <div v-if="menu" class="sheet">
            <ul class="sheet-items">
              <li v-for="item in nav" :key="item.to">
                <NuxtLink class="sheet-item" :to="item.to">{{ item.label }}</NuxtLink>
              </li>
            </ul>
            <ThemeToggle data-tip="Light or dark" />
          </div>
        </nav>
      </Island>
      <template #fallback>
        <Surface class="pill" variant="glass-liquid" shape="pill" pad="none">
          <nav aria-label="Main" class="row">
            <NuxtLink class="mark" to="/">Marco Dong</NuxtLink>
            <ul class="items wide">
              <li v-for="item in nav" :key="item.to">
                <NuxtLink class="item" :to="item.to">{{ item.label }}</NuxtLink>
              </li>
            </ul>
          </nav>
        </Surface>
      </template>
    </ClientOnly>
  </header>
</template>

<style scoped>
.bar {
  @apply pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 print:hidden;
  padding-top: calc(env(safe-area-inset-top) + 1rem);
}

.pill {
  @apply pointer-events-auto max-w-full;
}

.row {
  @apply flex h-14 items-center gap-2 ps-5 pe-2;
}

.mark {
  @apply typo-heading shrink-0 text-fg no-underline;

  &:focus-visible {
    @apply focus-ring rounded-field;
  }
}

.status {
  @apply flex items-center gap-2 pe-3;
}

.dot {
  @apply breathe size-2 rounded-full bg-primary;
}

.idle {
  @apply typo-caption whitespace-nowrap text-muted max-md:hidden;
}

.wide {
  @apply max-md:hidden;
}

.links {
  @apply relative flex items-center gap-1 ps-3;
}

.items {
  @apply m-0 flex list-none items-center gap-1 p-0;
}

.item {
  @apply typo-body-md block rounded-full px-3 py-2 whitespace-nowrap text-muted no-underline transition-colors duration-(--duration-fast) ease-out;

  &[aria-current="page"] {
    @apply text-fg;
  }

  &:focus-visible {
    @apply focus-ring;
  }
}

.underline {
  @apply pointer-events-none absolute bottom-2 left-0 h-0.5 w-px origin-left rounded-full bg-primary;

  &[data-visible="false"] {
    @apply opacity-0;
  }
}

.links :deep(.theme-toggle),
.sheet :deep(.theme-toggle) {
  @apply static ms-1 size-10 shrink-0 border-0 bg-transparent shadow-none;
}

.menu {
  @apply grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-fg md:hidden;

  &:focus-visible {
    @apply focus-ring;
  }
}

.burger {
  @apply relative block h-0.5 w-4 rounded-full bg-current transition-[background-color] duration-(--duration-fast);

  &::before,
  &::after {
    @apply absolute left-0 h-0.5 w-4 rounded-full bg-current transition-transform duration-(--duration-fast) ease-out;
    content: "";
  }

  &::before {
    @apply -translate-y-1.5;
  }

  &::after {
    @apply translate-y-1.5;
  }

  &[data-open="true"] {
    @apply bg-transparent;

    &::before {
      @apply translate-y-0 rotate-45;
    }

    &::after {
      @apply translate-y-0 -rotate-45;
    }
  }
}

.sheet {
  @apply flex w-72 max-w-full flex-col gap-2 px-3 pb-3 md:hidden;
}

.sheet-items {
  @apply m-0 flex list-none flex-col p-0;
}

.sheet-item {
  @apply typo-heading-lg block rounded-field px-3 py-3 text-fg no-underline;

  &[aria-current="page"] {
    @apply text-primary;
  }

  &:focus-visible {
    @apply focus-ring;
  }
}

.bar[data-tween="grow"] :deep(.responsive-box[data-animated="true"]) {
  transition-duration: var(--duration-moderate);
  transition-timing-function: var(--ease-drawer);
}

.bar[data-tween="fold"] :deep(.responsive-box[data-animated="true"]) {
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .item:hover {
    @apply text-fg;
  }
}
</style>
