export type StageTheme = "light" | "dark";

export const currentTheme = (): StageTheme => {
  const stamp = document.documentElement.dataset.theme;
  if (stamp === "light" || stamp === "dark") return stamp;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
