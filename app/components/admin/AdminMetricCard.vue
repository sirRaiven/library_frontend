<script setup lang="ts">
import AppMetricCard from "~/components/shared/AppMetricCard.vue";

withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    description?: string;
    icon: string;
    tone?: "primary" | "success" | "warning" | "error" | "info" | "neutral";
    loading?: boolean;
    to?: string;
  }>(),
  {
    description: "",
    tone: "neutral",
    loading: false,
    to: undefined,
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
    :to="to"
  />
</template>
