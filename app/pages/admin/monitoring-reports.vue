<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Reports",
});

await navigateTo({ path: "/admin/reports", query: { view: "monitoring" } }, { replace: true });
</script>

<template>
  <div />
</template>
