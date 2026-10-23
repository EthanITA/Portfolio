export const links = {
  github: "https://github.com/EthanITA",
  identity: "https://madong.me/#identity",
  linkedin: "https://www.linkedin.com/in/marcodong-838453",
  site: "https://madong.me",
} as const;

export type NavItem = { label: string; to: string };

export const nav: NavItem[] = [
  { label: "Sidecar", to: "/sidecar" },
  { label: "Sage", to: "/sage" },
  { label: "AI Shell", to: "/shell" },
  { label: "How I work", to: "/how" },
  { label: "About", to: "/about" },
  { label: "CV", to: "/cv" },
];

export const emailParts = ["info", "madong.me"] as const;
