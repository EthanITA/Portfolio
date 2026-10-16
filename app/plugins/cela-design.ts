import { CelaDesign } from "@cela/design";

export default defineNuxtPlugin((nuxt) => {
  nuxt.vueApp.use(CelaDesign);
});
