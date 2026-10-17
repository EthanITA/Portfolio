<script setup lang="ts">
import { links } from "~/utils/site/links";
import { products } from "~/utils/site/products";
import { seo } from "~/utils/site/seo";

const { title, description } = seo.shell;

useSeoMeta({ title, description });
defineOgImage("Card", { title, sub: products.shell.sub });
useSchemaOrg([
  defineSoftwareApp({
    name: title,
    description,
    applicationCategory: "DeveloperApplication",
    author: { "@id": links.identity },
  }),
]);
</script>

<template>
  <SiteProduct slug="shell" />
</template>
