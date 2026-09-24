<script setup lang="ts">
withDefaults(
  defineProps<{
    items: any[];
    label?: string;
    icon?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
  }>(),
  {
    label: "More",
    icon: "i-lucide-ellipsis",
    size: "sm",
  },
);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      :label="label"
      :icon="icon"
      color="neutral"
      variant="outline"
      :size="size"
      class="sncbt-overflow-action"
    />
  </UDropdownMenu>
</template>
