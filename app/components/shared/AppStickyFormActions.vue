<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string;
  }>(),
  {
    description: "",
  },
);
</script>

<template>
  <div class="sncbt-form-actions">
    <p v-if="description" class="sncbt-form-actions__description">{{ description }}</p>
    <div v-if="$slots.secondary" class="sncbt-form-actions__secondary">
      <slot name="secondary" />
    </div>
    <div class="sncbt-form-actions__primary">
      <slot />
    </div>
  </div>
</template>
