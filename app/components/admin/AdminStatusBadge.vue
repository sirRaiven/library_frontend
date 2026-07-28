<script setup lang="ts">
const props = defineProps<{
  label: string;
}>();

const badge = computed(() => {
  const normalized = props.label.trim().toLowerCase();

  if (["active", "confirmed", "success", "operational"].includes(normalized)) {
    return { color: "success" as const, icon: "i-lucide-circle-check" };
  }

  if (["blocked", "inactive", "failure", "failed"].includes(normalized)) {
    return { color: "error" as const, icon: "i-lucide-circle-x" };
  }

  if (["unconfirmed", "pending", "warning", "checking"].includes(normalized)) {
    return { color: "warning" as const, icon: "i-lucide-clock-3" };
  }

  return { color: "neutral" as const, icon: "i-lucide-circle" };
});
</script>

<template>
  <UBadge
    :label="label"
    :color="badge.color"
    variant="soft"
    :icon="badge.icon"
    size="sm"
  />
</template>
