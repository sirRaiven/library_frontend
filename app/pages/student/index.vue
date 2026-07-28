<script setup lang="ts">
definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "Student Portal",
  roleTitle: "Student",
});

await navigateTo("/student/dashboard", { replace: true });
</script>

<template>
  <div />
</template>
