import tailwindcss from "@tailwindcss/vite";
import tailwindAutoReference from "vite-plugin-vue-tailwind-auto-reference";

export default defineNuxtConfig({
  compatibilityDate: "latest",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  modules: ["@nuxtjs/seo", "@nuxt/fonts", "@pinia/nuxt"],
  nitro: { prerender: { crawlLinks: true, routes: ["/"] } },
  site: {
    url: "https://madong.me",
    name: "Marco Dong",
    description: "AI product engineer in Milan. I build AI products end to end: Sidecar, Sage and AI Shell at Cela.",
    defaultLocale: "en",
  },
  // Prerendered at build so crawlers and AI agents read real HTML; nothing renders on a server at runtime.
  ssr: true,
  typescript: { strict: true },
  vite: { plugins: [tailwindAutoReference(["./assets/css/main.css"]), tailwindcss()] },
});
