<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description: string;
  icon?: string;
}>();
</script>

<template>
  <div class="sncbt-page-hero">
    <div class="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-start gap-4">
        <div class="sncbt-icon-tile flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
          <UIcon :name="icon || 'i-lucide-graduation-cap'" class="size-6" />
        </div>
        <div class="min-w-0">
          <p v-if="eyebrow" class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {{ eyebrow }}
          </p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
            {{ title }}
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {{ description }}
          </p>
        </div>
      </div>

      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
