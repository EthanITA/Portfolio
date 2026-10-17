<script setup lang="ts">
import { links } from "~/utils/site/links";
import { products } from "~/utils/site/products";
import { seo } from "~/utils/site/seo";

const { title, description } = seo.sage;

useSeoMeta({ title, description });
defineOgImage("Card", { title, sub: products.sage.sub });
useSchemaOrg([
  defineSoftwareApp({
    name: title,
    description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "macOS",
    author: { "@id": links.identity },
  }),
]);
</script>

<template>
  <SiteProduct slug="sage" />
</template>
