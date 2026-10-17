export type PageSeo = { path: string; title: string; description: string };

export const seo = {
  home: {
    path: "/",
    title: "Marco Dong · AI product engineer",
    description:
      "Marco Dong, AI product engineer in Milan. I build AI products end to end: Sidecar, Sage and AI Shell at Cela, and agents at Klarna and Moneyfarm.",
  },
  sidecar: {
    path: "/sidecar",
    title: "Sidecar",
    description:
      "Sidecar is a companion window for Claude Code. Review every change line by line and send comments back into the conversation.",
  },
  sage: {
    path: "/sage",
    title: "Sage",
    description:
      "Sage is a Mac assistant in the notch. Hold a key, say what you want, and it does the steps, asking before anything it can't undo.",
  },
  shell: {
    path: "/shell",
    title: "AI Shell",
    description:
      "AI Shell turns plain words into shell commands, runs the ones that only look, and stops before anything destructive.",
  },
  how: {
    path: "/how",
    title: "How I work",
    description: "How Marco Dong works with AI agents: the rules they work under and the hooks that enforce them.",
  },
  about: {
    path: "/about",
    title: "About",
    description: "Marco Dong: computer science in Bologna, an MBA, Deloitte, Indra, Klarna, Moneyfarm and Cela.",
  },
  cv: {
    path: "/cv",
    title: "CV",
    description: "The CV of Marco Dong, AI product engineer. Agent products, end to end.",
  },
} as const satisfies Record<string, PageSeo>;
