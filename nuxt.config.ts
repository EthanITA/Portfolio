import tailwindcss from "@tailwindcss/vite";
import tailwindAutoReference from "vite-plugin-vue-tailwind-auto-reference";

import { links } from "./app/utils/site/links.ts";
import { type PageSeo, seo } from "./app/utils/site/seo.ts";

const markdown = (page: PageSeo): { title: string; href: string; description: string } => ({
  title: page.title,
  href: `${links.site}${page.path}.md`,
  description: page.description,
});

// Runs before first paint: a stored dark choice never flashes light, and entrances hide only when they will play.
const headScript = `(function(){var d=document.documentElement;try{d.dataset.theme=localStorage.getItem("cela-theme")==="dark"?"dark":"light"}catch(e){d.dataset.theme="light"}d.dataset.motion=matchMedia("(prefers-reduced-motion: reduce)").matches?"off":"on";setTimeout(function(){if(!("ready" in d.dataset))d.dataset.motion="off"},3000)})()`;

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
      pages: false,
      sections: [
        { title: "Sidecar, Sage and AI Shell", links: [seo.sidecar, seo.sage, seo.shell].map(markdown) },
        {
          title: "Marco Dong",
          links: [
            ...[seo.how, seo.about, seo.cv].map(markdown),
            { title: "Download PDF", href: `${links.site}/marco-dong-cv.pdf`, description: seo.cv.description },
          ],
        },
        {
          title: "Contact",
          links: [
            { title: "LinkedIn", href: links.linkedin, description: "LinkedIn is the fastest way to reach me." },
            { title: "GitHub", href: links.github },
          ],
        },
      ],
    },
  },
  app: {
    head: {
      script: [{ innerHTML: headScript, tagPriority: "critical" }],
    },
  },
  compatibilityDate: "latest",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  experimental: { prerenderErrorPages: true },
  fonts: {
    defaults: { styles: ["normal"], subsets: ["latin", "latin-ext"] },
    families: [
      { name: "Plus Jakarta Sans", global: true, preload: true, weights: [400, 500, 600, 700] },
      { name: "DM Mono", global: true, weights: [400, 500] },
    ],
  },
  // The CV links madong.me absolutely on purpose: the printed PDF has no page origin to resolve "/" against.
  linkChecker: { failOnError: true, skipInspections: ["absolute-site-urls"] },
  modules: ["@nuxtjs/seo", "@nuxt/fonts", "@pinia/nuxt"],
  nitro: { prerender: { crawlLinks: true, ignore: ["/film"], routes: ["/"] } },
  ogImage: { defaults: { height: 630, width: 1200 }, zeroRuntime: true },
  routeRules: { "/404.html": { robots: false } },
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
    description: seo.home.description,
    defaultLocale: "en",
    separator: "·",
  },
  // Prerendered at build so crawlers and AI agents read real HTML; nothing renders on a server at runtime.
  ssr: true,
  typescript: { strict: true },
  vite: { plugins: [tailwindAutoReference(["./assets/css/main.css"]), tailwindcss()] },
});
