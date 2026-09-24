<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    description?: string;
    stickyOnMobile?: boolean;
    align?: "start" | "end" | "between";
  }>(),
  {
    label: "",
    description: "",
    stickyOnMobile: false,
    align: "end",
  },
);
</script>

<template>
  <div
    class="sncbt-action-bar"
    :class="[
      `sncbt-action-bar--${align}`,
      stickyOnMobile ? 'sncbt-action-bar--mobile-sticky' : '',
    ]"
  >
    <div v-if="label || description" class="min-w-0 flex-1">
      <p v-if="label" class="text-sm font-semibold text-highlighted">{{ label }}</p>
      <p v-if="description" class="mt-0.5 text-xs leading-5 text-muted">{{ description }}</p>
    </div>

    <div v-if="$slots.secondary" class="sncbt-action-bar__secondary">
      <slot name="secondary" />
    </div>

    <div class="sncbt-action-bar__primary">
      <slot />
    </div>
  </div>
</template>
