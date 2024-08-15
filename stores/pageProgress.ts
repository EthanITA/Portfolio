import { onMounted } from "vue";

export const usePageProgress = defineStore("page-progress", () => {
  const percentage = ref(0);

  const updatePercentage = () => {
    const scroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    percentage.value = (scroll / height) * 100;
  };

  onMounted(() => {
    window.addEventListener("scroll", updatePercentage);

    window.addEventListener("resize", updatePercentage);
  });

  return {
    percentage,
  };
});
