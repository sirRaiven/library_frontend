<script setup lang="ts">
definePageMeta({ layout: "faculty", middleware: ["faculty"] });
await navigateTo("/faculty/dashboard", { replace: true });
</script>

<template><div /></template>
