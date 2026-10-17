import type { Ref } from "vue";

import { onMounted, readonly, ref } from "vue";

const KEY = "play-invited";

// Hidden until the client has read the flag, so the server render and hydration never disagree.
const seen = ref(true);
let dismissed = false;

const stored = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const useInvite = (): { seen: Readonly<Ref<boolean>>; dismiss: () => void } => {
  onMounted(() => {
    seen.value = dismissed || stored();
  });
  return {
    seen: readonly(seen),
    dismiss: () => {
      dismissed = true;
      seen.value = true;
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
    },
  };
};
