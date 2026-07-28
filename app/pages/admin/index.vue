<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "System Overview",
});

await navigateTo("/admin/dashboard", { replace: true });
</script>

<template>
  <div />
</template>
