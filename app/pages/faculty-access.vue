<script setup lang="ts">
definePageMeta({
  middleware: ["faculty"],
  title: "Faculty Portal",
});

await navigateTo("/faculty/dashboard", { replace: true });
</script>

<template>
  <div />
</template>
