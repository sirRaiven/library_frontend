<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
</script>

<template>
  <AppSkipLink />
  <div class="sncbt-public-default-layout min-h-dvh bg-[var(--sncbt-canvas)] text-default">
    <slot />
  </div>
</template>
