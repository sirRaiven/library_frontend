<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    sticky?: boolean;
  }>(),
  {
    title: "",
    description: "",
    sticky: false,
  },
);
</script>

<template>
  <section class="sncbt-filter-panel" :class="sticky ? 'sncbt-filter-panel-sticky' : ''">
    <div v-if="title || description || $slots.actions" class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 v-if="title" class="text-sm font-semibold text-highlighted">{{ title }}</h2>
        <p v-if="description" class="mt-0.5 text-xs leading-5 text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
