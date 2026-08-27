<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
    compact?: boolean;
  }>(),
  {
    description: "",
    icon: "",
    compact: false,
  },
);
</script>

<template>
  <div
    class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    :class="compact ? 'mb-3' : 'mb-4'"
  >
    <div class="min-w-0">
      <div class="flex items-center gap-2.5">
        <div
          v-if="icon"
          class="sncbt-section-icon flex size-8 shrink-0 items-center justify-center rounded-lg"
          aria-hidden="true"
        >
          <UIcon :name="icon" class="size-4" />
        </div>
        <h2 class="text-base font-semibold tracking-tight text-highlighted sm:text-lg">
          {{ title }}
        </h2>
      </div>
      <p v-if="description" class="mt-1 max-w-3xl text-sm leading-5 text-muted">
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
