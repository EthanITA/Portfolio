import { onMounted } from "vue";

export interface Tab {
  name: string;
  kbd: string;
  href: string;
}

export const usePage = defineStore("page", () => {
  const progress = ref(0);
  const tabs = reactive<{
    list: Tab[];
    selection: {
      index: number;
      el: HTMLAnchorElement | null;
      style: {
        width: string;
        height: string;
        transform: string;
      };
    };
    selectionBox: HTMLElement | null;
  }>({
    list: [
      { name: "Home", kbd: "/", href: "#home" },
      { name: "About", kbd: "A", href: "#about" },
      { name: "Projects", kbd: "P", href: "#projects" },
      { name: "Contact", kbd: "C", href: "#contact" },
    ],
    selection: {
      index: 0,
      el: null,
      style: {
        width: "0px",
        height: "0px",
        transform: "translate(0px, 0px)",
      },
    },
    selectionBox: null,
  });

  const updatePercentage = () => {
    const scroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    progress.value = (scroll / height) * 100;
  };
  const updateTabSelection = () =>
    nextTick(() => {
      if (!tabs.selectionBox || !tabs.selection.el) return;
      tabs.selection.style.width = `${tabs.selection.el.clientWidth}px`;
      tabs.selection.style.height = `${tabs.selection.el.clientHeight}px`;
      tabs.selection.style.transform = `translate(${tabs.selection.el.offsetLeft}px, ${-tabs.selection.el.offsetTop}px)`;
    });

  watch(
    [() => tabs.selectionBox, () => tabs.selection.el],
    updateTabSelection,
    { immediate: true },
  );

  const selectTab = (tab: Tab) => {
    const el = document.querySelector<HTMLAnchorElement>(
      `a.tab[href="${tab.href}"][role=tab]`,
    );
    if (!el) return;
    tabs.selection.el = el;
    tabs.selection.index = tabs.list.indexOf(tab);
    useRouter().push(tab.href);
  };

  const nextTab = () => {
    const index = (tabs.selection.index + 1) % tabs.list.length;
    selectTab(tabs.list[index]);
  };
  const prevTab = () => {
    const index =
      (tabs.selection.index - 1 + tabs.list.length) % tabs.list.length;
    selectTab(tabs.list[index]);
  };

  onMounted(() => {
    window.addEventListener("scroll", updatePercentage);

    window.addEventListener("resize", () => {
      updatePercentage();
      updateTabSelection();
    });

    window.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (e.key === "ArrowLeft") prevTab();
        if (e.key === "ArrowRight") nextTab();
        return;
      }
      // @ts-ignore
      const tab = tabs.list.find<Tab>((tab) => tab.kbd === e.key.toUpperCase());
      if (!tab) return;
      selectTab(tab);
    });
  });

  return {
    progress,
    tabs,
  };
});
