<script setup lang="ts">
import AppMetricCard from "~/components/shared/AppMetricCard.vue";

withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    description: string;
    icon: string;
    tone?: "primary" | "success" | "warning" | "error" | "info" | "neutral";
    loading?: boolean;
  }>(),
  {
    tone: "primary",
    loading: false,
  },
);
</script>

<template>
  <AppMetricCard
    :label="label"
    :value="value"
    :description="description"
    :icon="icon"
    :tone="tone"
    :loading="loading"
  />
</template>
