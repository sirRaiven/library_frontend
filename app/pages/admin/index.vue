<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Dashboard",
});

await navigateTo("/admin/dashboard", { replace: true });
</script>

<template>
  <div />
</template>
