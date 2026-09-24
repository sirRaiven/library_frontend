<script setup lang="ts">
const props = withDefaults(
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

const toneClasses = computed(() => {
  const map = {
    primary: "bg-primary/10 text-primary ring-primary/15",
    success: "bg-success/10 text-success ring-success/15",
    warning: "bg-warning/10 text-warning ring-warning/15",
    error: "bg-error/10 text-error ring-error/15",
    info: "bg-info/10 text-info ring-info/15",
    neutral: "bg-elevated text-muted ring-default",
  };

  return map[props.tone];
});
</script>

<template>
  <component
    :is="to ? resolveComponent('NuxtLink') : 'div'"
    :to="to"
    class="sncbt-metric-card group block h-full"
    :class="to ? 'sncbt-card-interactive cursor-pointer' : ''"
  >
    <div class="flex h-full items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-[0.11em] text-muted">{{ label }}</p>
        <USkeleton v-if="loading" class="mt-3 h-9 w-24" />
        <p v-else class="mt-2 text-3xl font-bold tracking-tight text-highlighted">{{ value }}</p>
        <p v-if="description" class="mt-2 hidden text-xs leading-5 text-muted sm:block">{{ description }}</p>
      </div>
      <div
        class="sncbt-icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset"
        :class="toneClasses"
        aria-hidden="true"
      >
        <UIcon :name="icon" class="size-5" />
      </div>
    </div>
  </component>
</template>
