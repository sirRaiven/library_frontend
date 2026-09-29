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
    icon: "i-lucide-inbox",
    compact: false,
  },
);
</script>

<template>
  <div
    class="flex flex-col items-center justify-center px-5 text-center"
    :class="compact ? 'py-8' : 'py-14 sm:py-16'"
    role="status"
  >
    <div class="flex size-12 items-center justify-center rounded-2xl bg-elevated text-muted ring-1 ring-default" aria-hidden="true">
      <UIcon :name="icon" class="size-5" />
    </div>
    <h3 class="mt-3 text-sm font-semibold text-highlighted">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-lg text-sm leading-6 text-muted">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-4 flex flex-wrap justify-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
