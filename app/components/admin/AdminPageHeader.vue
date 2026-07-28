<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description: string;
  icon?: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex min-w-0 items-start gap-3">
      <div
        v-if="icon"
        class="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
      >
        <UIcon :name="icon" class="size-5" />
      </div>

      <div class="min-w-0">
        <p
          v-if="eyebrow"
          class="text-xs font-bold uppercase tracking-[0.12em] text-primary"
        >
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

    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
