import { addComponentsDir, addImportsDir, createResolver, defineNuxtModule, extendPages } from "nuxt/kit";
import { basename } from "node:path";
import { glob } from "node:fs/promises";

export default defineNuxtModule({
  meta: { name: "film" },
  async setup(_, nuxt) {
    const { resolve } = createResolver(nuxt.options.rootDir);

    nuxt.hook("prepare:types", ({ tsConfig, nodeTsConfig }) => {
      tsConfig.include?.push(resolve("films/pages/**/*"), resolve("films/components/**/*"), resolve("films/composables/**/*"));
      nodeTsConfig.include?.push(resolve("tools/render/**/*"));
    });

    // Typecheck needs the film components and imports; only `FILM=1 nuxt dev` serves the routes, so generate and build never see one.
    if (!nuxt.options._prepare && !(nuxt.options.dev && process.env.FILM === "1")) return;

    // Nobody watches a film route in a browser, and a hot update mid-render would rebuild the timeline under the renderer.
    if (nuxt.options.dev) nuxt.options.vite.server = { ...nuxt.options.vite.server, hmr: false };
    nuxt.options.routeRules = { ...nuxt.options.routeRules, "/film/**": { ssr: false } };

    addComponentsDir({ path: resolve("films/components"), prefix: "Film" });
    addImportsDir(resolve("films/composables"));

    const pages: string[] = [];
    for await (const file of glob("films/pages/**/*.vue", { cwd: nuxt.options.rootDir })) pages.push(file);

    extendPages((routes) => {
      for (const file of pages) {
        const name = basename(file, ".vue");
        routes.push({ name: `film-${name}`, path: `/film/${name}`, file: resolve(file), meta: { layout: false } });
      }
    });
  },
});
