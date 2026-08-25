<script setup lang="ts">
import AppPageHeader from "~/components/shared/AppPageHeader.vue";

defineProps<{
  eyebrow?: string;
  title: string;
  description: string;
  icon?: string;
}>();
</script>

<template>
  <AppPageHeader
    :eyebrow="eyebrow"
    :title="title"
    :description="description"
    :icon="icon || 'i-lucide-shield-check'"
  >
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
  </AppPageHeader>
</template>
