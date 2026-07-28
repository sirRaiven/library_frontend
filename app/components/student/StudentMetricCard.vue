<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    description: string;
    icon: string;
    tone?: "primary" | "success" | "warning" | "error" | "neutral";
    loading?: boolean;
  }>(),
  {
    tone: "primary",
    loading: false,
  },
);

const toneClasses = computed(() => {
  const classes = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
    neutral: "bg-elevated text-muted",
  };

  return classes[props.tone];
});
</script>

<template>
  <UCard class="h-full" :ui="{ body: 'p-5 sm:p-5' }">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {{ label }}
        </p>
        <USkeleton v-if="loading" class="mt-3 h-9 w-20" />
        <p v-else class="mt-2 text-3xl font-bold tracking-tight text-highlighted">
          {{ value }}
        </p>
        <p class="mt-2 text-xs leading-5 text-muted">
          {{ description }}
        </p>
      </div>

      <div class="flex size-11 shrink-0 items-center justify-center rounded-xl" :class="toneClasses">
        <UIcon :name="icon" class="size-5" />
      </div>
    </div>
  </UCard>
</template>
