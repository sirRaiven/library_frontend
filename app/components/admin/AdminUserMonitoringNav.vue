<script setup lang="ts">
const props = defineProps<{
  userId: number;
  active: "overview" | "activity" | "sessions" | "devices";
}>();

const items = computed(() => [
  {
    key: "overview" as const,
    label: "Account Overview",
    icon: "i-lucide-user-round-cog",
    to: `/admin/users/${props.userId}`,
  },
  {
    key: "activity" as const,
    label: "Activity",
    icon: "i-lucide-activity",
    to: `/admin/users/${props.userId}/activity`,
  },
  {
    key: "sessions" as const,
    label: "Sessions",
    icon: "i-lucide-monitor-dot",
    to: `/admin/users/${props.userId}/sessions`,
  },
  {
    key: "devices" as const,
    label: "Devices",
    icon: "i-lucide-monitor-smartphone",
    to: `/admin/users/${props.userId}/devices`,
  },
]);
</script>

<template>
  <UCard :ui="{ body: 'p-2 sm:p-2' }">
    <nav class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="User monitoring sections">
      <UButton
        v-for="item in items"
        :key="item.key"
        :label="item.label"
        :icon="item.icon"
        :to="item.to"
        :color="active === item.key ? 'primary' : 'neutral'"
        :variant="active === item.key ? 'soft' : 'ghost'"
        block
        class="justify-start"
      />
    </nav>
  </UCard>
</template>
