<script setup lang="ts">
withDefaults(
  defineProps<{
    mobileLabel?: string;
    desktopLabel?: string;
  }>(),
  {
    mobileLabel: "Records",
    desktopLabel: "Data table",
  },
);
</script>

<template>
  <div class="sncbt-responsive-data-view">
    <div class="md:hidden" role="region" :aria-label="mobileLabel">
      <slot name="mobile" />
    </div>
    <div class="hidden md:block" role="region" :aria-label="desktopLabel">
      <slot name="desktop" />
    </div>
  </div>
</template>
