<script setup lang="ts">
import type { AdminProfileLinkStatus } from "~/composables/useAdminUsers";

const props = defineProps<{
  status?: AdminProfileLinkStatus;
}>();

const badge = computed(() => {
  const map = {
    Linked: {
      color: "success" as const,
      icon: "i-lucide-link-2",
      label: "Profile linked",
    },
    Missing: {
      color: "warning" as const,
      icon: "i-lucide-link-2-off",
      label: "Profile missing",
    },
    Mismatch: {
      color: "error" as const,
      icon: "i-lucide-triangle-alert",
      label: "Profile mismatch",
    },
    "Not Required": {
      color: "neutral" as const,
      icon: "i-lucide-minus",
      label: "Not required",
    },
    "Unsupported Role": {
      color: "neutral" as const,
      icon: "i-lucide-circle-help",
      label: "Not managed",
    },
    Unavailable: {
      color: "neutral" as const,
      icon: "i-lucide-cloud-alert",
      label: "Details unavailable",
    },
  };

  return map[props.status ?? "Unavailable"];
});
</script>

<template>
  <UBadge
    :label="badge.label"
    :color="badge.color"
    variant="soft"
    :icon="badge.icon"
    size="sm"
  />
</template>
