<script setup lang="ts">
import { links } from "~/utils/site/links";
import { products } from "~/utils/site/products";
import { seo } from "~/utils/site/seo";

const { title, description } = seo.sidecar;

useSeoMeta({ title, description });
defineOgImage("Card", { title, sub: products.sidecar.sub });
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
  <SiteProduct slug="sidecar" />
</template>
