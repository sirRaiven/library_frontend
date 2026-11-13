<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
const { isNavigating: pageLoading } = usePageExperience();
</script>

<template>
  <AppSkipLink />
  <div class="sncbt-public-default-layout relative min-h-dvh bg-[var(--sncbt-canvas)] text-default">
    <AppPageLoadingSkeleton v-if="pageLoading" />
    <slot />
  </div>
</template>
