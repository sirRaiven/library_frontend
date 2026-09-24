<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    error?: string;
    empty?: boolean;
    loadingRows?: number;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: string;
  }>(),
  {
    loading: false,
    error: "",
    empty: false,
    loadingRows: 4,
    emptyTitle: "Nothing to show",
    emptyDescription: "There are no records in this view.",
    emptyIcon: "i-lucide-inbox",
  },
);
</script>

<template>
  <div v-if="loading" class="sncbt-loading-list" aria-busy="true" aria-live="polite">
    <span class="sr-only">Loading content</span>
    <USkeleton v-for="index in loadingRows" :key="index" class="h-16 w-full rounded-lg" />
  </div>

  <UAlert
    v-else-if="error"
    color="error"
    variant="soft"
    icon="i-lucide-circle-alert"
    title="Unable to load this view"
    :description="error"
  >
    <template v-if="$slots.retry" #actions>
      <slot name="retry" />
    </template>
  </UAlert>

  <AppEmptyState
    v-else-if="empty"
    :title="emptyTitle"
    :description="emptyDescription"
    :icon="emptyIcon"
  >
    <template v-if="$slots.emptyActions" #actions>
      <slot name="emptyActions" />
    </template>
  </AppEmptyState>

  <slot v-else />
</template>
