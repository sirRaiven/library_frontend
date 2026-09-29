<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    to: string;
    count: number;
    active?: boolean;
    label?: string;
  }>(),
  {
    active: false,
    label: "Notifications",
  },
);

const normalizedCount = computed(() =>
  Math.max(0, Number.isFinite(props.count) ? Math.floor(props.count) : 0),
);

const displayCount = computed(() =>
  normalizedCount.value > 99 ? "99+" : String(normalizedCount.value),
);

const notificationLabel = computed(() => {
  if (normalizedCount.value === 0) {
    return `Open ${props.label.toLowerCase()}`;
  }

  return `Open ${props.label.toLowerCase()}. ${normalizedCount.value} unread notification${normalizedCount.value === 1 ? "" : "s"}.`;
});

const tooltipText = computed(() =>
  normalizedCount.value > 0
    ? `${displayCount.value} unread notification${normalizedCount.value === 1 ? "" : "s"}`
    : props.label,
);
</script>

<template>
  <UTooltip
    :text="tooltipText"
    :content="{ side: 'bottom', sideOffset: 8 }"
  >
    <UButton
      :to="to"
      color="neutral"
      :variant="active ? 'soft' : 'ghost'"
      size="lg"
      square
      class="relative size-11 overflow-visible rounded-xl"
      :aria-label="notificationLabel"
      :aria-current="active ? 'page' : undefined"
    >
      <UIcon
        :name="normalizedCount > 0 ? 'i-lucide-bell-ring' : 'i-lucide-bell'"
        class="size-5"
        aria-hidden="true"
      />

      <span
        v-if="normalizedCount > 0"
        class="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-[var(--ui-bg)]"
        aria-hidden="true"
      >
        {{ displayCount }}
      </span>

      <span
        class="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {{
          normalizedCount > 0
            ? `${normalizedCount} unread notification${normalizedCount === 1 ? '' : 's'}`
            : 'No unread notifications'
        }}
      </span>
    </UButton>
  </UTooltip>
</template>
