import tailwindcss from "@tailwindcss/vite";
import tailwindAutoReference from "vite-plugin-vue-tailwind-auto-reference";

import { links } from "./app/utils/site/links.ts";

const description =
  "Marco Dong, AI product engineer in Milan. I build AI products end to end: Sidecar, Sage and AI Shell at Cela, and agents at Klarna and Moneyfarm.";

// Runs before the stylesheet paints, so a stored dark choice never flashes light first.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem("cela-theme")==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

const aiCrawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
];

export default defineNuxtConfig({
  aiReady: {
    contentSignal: { aiInput: true, aiTrain: true, search: true },
    llmsTxt: {
      notes: [
        "I build AI products end to end. The agents write a lot of the code, and the standard is mine.",
        "Software engineer at Klarna, AI product engineer at Moneyfarm, and founder of Cela, where I'm building Sidecar, Sage and AI Shell.",
        "Three products, one rule. A step that only looks runs by itself. A step that changes something waits for you. A step you can't take back stops at the line, and the click is yours.",
      ].join("\n\n"),
      sections: [
        {
          title: "Contact",
          links: [
            { title: "LinkedIn", href: links.linkedin, description: "LinkedIn is the fastest way to reach me." },
            { title: "GitHub", href: links.github },
            { title: "CV", href: "/marco-dong-cv.pdf" },
          ],
        },
      ],
    },
  },
  app: {
    head: {
      script: [{ innerHTML: themeScript, tagPriority: "critical" }],
    },
  },
  compatibilityDate: "latest",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  fonts: {
    families: [
      { name: "Plus Jakarta Sans", global: true, preload: true, weights: [400, 500, 600, 700] },
      { name: "DM Mono", global: true, weights: [400, 500] },
    ],
  },
  // The CV links madong.me absolutely on purpose: the printed PDF has no page origin to resolve "/" against.
  linkChecker: { failOnError: true, skipInspections: ["absolute-site-urls"] },
  modules: ["@nuxtjs/seo", "@nuxt/fonts", "@pinia/nuxt"],
  nitro: { prerender: { crawlLinks: true, ignore: ["/film"], routes: ["/"] } },
  robots: {
    groups: [{ allow: ["/"], userAgent: aiCrawlers }],
  },
  schemaOrg: {
    identity: {
      type: "Person",
      name: "Marco Dong",
      jobTitle: "AI Product Engineer",
      url: links.site,
      address: { addressLocality: "Milan", addressCountry: "IT" },
      sameAs: [links.linkedin, links.github],
      alumniOf: [
        { "@type": "CollegeOrUniversity", name: "University of Bologna" },
        { "@type": "CollegeOrUniversity", name: "Bologna Business School" },
      ],
      worksFor: { "@type": "Organization", name: "Klarna" },
      knowsLanguage: ["it", "en"],
    },
  },
  site: {
    url: links.site,
    name: "Marco Dong",
    description,
    defaultLocale: "en",
    separator: "·",
  },
  // Prerendered at build so crawlers and AI agents read real HTML; nothing renders on a server at runtime.
  ssr: true,
  typescript: { strict: true },
  vite: { plugins: [tailwindAutoReference(["./assets/css/main.css"]), tailwindcss()] },
});
