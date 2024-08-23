<template>
  <Scrollbar class="fixed right-0" />
  <Navigation class="z-20 fixed top-8 left-[50%] -translate-x-1/2" />
  <Cursor />
  <div class="h-full w-full pr-2">
    <NuxtPage />
    <Footer />
  </div>
</template>
<script lang="ts" setup></script>
