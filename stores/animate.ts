import gsap from "gsap";

export const useAnimate = defineStore("animate", () => {
  const instance = computed(() => (import.meta.client ? gsap : null));
  return {
    instance,
  };
});
