<script setup lang="ts">
const props = defineProps<{
  status: string | null | undefined;
}>();

const normalized = computed(() => String(props.status ?? "Unknown").trim());

const color = computed(() => {
  const value = normalized.value.toLowerCase();

  if (
    ["active", "released", "available", "approved", "ready for pickup", "success"].includes(value)
  ) {
    return "success" as const;
  }

  if (["overdue", "suspended", "blocked", "critical", "lost"].includes(value)) {
    return "error" as const;
  }

  if (
    ["pending", "on process", "expiring", "warning", "replacement", "printed"].includes(value)
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
});
</script>

<template>
  <UBadge :label="normalized" :color="color" variant="soft" size="sm" />
</template>
