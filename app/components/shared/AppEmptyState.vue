<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description: string;
    icon?: string;
    compact?: boolean;
  }>(),
  {
    icon: "i-lucide-inbox",
    compact: false,
  },
);
</script>

<template>
  <div class="sncbt-empty-state" :class="compact ? '!py-6' : ''">
    <div class="sncbt-empty-icon mx-auto flex size-11 items-center justify-center rounded-xl" aria-hidden="true">
      <UIcon :name="icon" class="size-5" />
    </div>
    <h3 class="mt-3 text-sm font-semibold text-highlighted sm:text-base">{{ title }}</h3>
    <p class="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-4 flex flex-wrap justify-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
