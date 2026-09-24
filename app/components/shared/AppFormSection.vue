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
  <section class="sncbt-form-section" :class="compact ? 'sncbt-form-section--compact' : ''">
    <div class="sncbt-form-section__heading">
      <div v-if="icon" class="sncbt-section-icon flex size-8 shrink-0 items-center justify-center rounded-lg" aria-hidden="true">
        <UIcon :name="icon" class="size-4" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold tracking-tight text-highlighted">{{ title }}</h2>
        <p v-if="description" class="mt-1 max-w-3xl text-sm leading-5 text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="sncbt-action-row shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <div class="sncbt-form-section__body">
      <slot />
    </div>
  </section>
</template>
