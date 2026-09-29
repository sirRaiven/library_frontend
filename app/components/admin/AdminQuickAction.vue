<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    description: string;
    icon: string;
    to: string;
    tone?: "primary" | "success" | "warning" | "error" | "info" | "neutral";
  }>(),
  {
    tone: "neutral",
  },
);

const toneClasses = {
  primary: "bg-primary/10 text-primary ring-primary/15",
  success: "bg-success/10 text-success ring-success/15",
  warning: "bg-warning/10 text-warning ring-warning/15",
  error: "bg-error/10 text-error ring-error/15",
  info: "bg-info/10 text-info ring-info/15",
  neutral: "bg-elevated text-muted ring-default",
} as const;

const toneClass = computed(() => toneClasses[props.tone || "neutral"]);
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex min-h-24 items-start gap-3 rounded-2xl border border-default bg-default p-4 shadow-sm outline-none transition hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
  >
    <div class="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset" :class="toneClass" aria-hidden="true">
      <UIcon :name="icon" class="size-5" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <p class="font-semibold text-highlighted">{{ label }}</p>
        <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-dimmed transition group-hover:text-primary" aria-hidden="true" />
      </div>
      <p class="mt-1 text-xs leading-5 text-muted">{{ description }}</p>
    </div>
  </NuxtLink>
</template>
