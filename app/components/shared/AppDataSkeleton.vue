<script setup lang="ts">
/** Content-shaped placeholders for the first API request or document generation.
 * Keep already-loaded content visible during a later refresh. */
withDefaults(defineProps<{
  variant?: "form" | "metrics" | "table" | "report" | "preview";
  rows?: number;
  label?: string;
}>(), {
  variant: "table",
  rows: 4,
  label: "Loading information",
});
</script>

<template>
  <section class="sncbt-data-skeleton space-y-4" role="status">
    <span class="sr-only">{{ label }}. Please wait.</span>
    <template v-if="variant === 'metrics'">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="index in 4" :key="index" class="sncbt-skeleton-panel space-y-3">
          <USkeleton aria-hidden="true" class="h-3 w-24 rounded" />
          <USkeleton aria-hidden="true" class="h-8 w-28 rounded-lg" />
          <USkeleton aria-hidden="true" class="h-3 w-3/4 rounded" />
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div v-for="index in 2" :key="index" class="sncbt-skeleton-panel space-y-4">
          <USkeleton aria-hidden="true" class="h-5 w-40 rounded" />
          <USkeleton aria-hidden="true" v-for="row in 3" :key="row" class="h-10 w-full rounded-lg" />
        </div>
      </div>
    </template>
    <div v-else-if="variant === 'form'" class="sncbt-skeleton-panel max-w-5xl space-y-5">
      <USkeleton aria-hidden="true" class="h-5 w-44 rounded" />
      <div class="grid gap-5 sm:grid-cols-2">
        <div v-for="index in rows" :key="index" class="space-y-2">
          <USkeleton aria-hidden="true" class="h-3 w-28 rounded" />
          <USkeleton aria-hidden="true" class="h-11 w-full rounded-lg" />
        </div>
      </div>
      <USkeleton aria-hidden="true" class="h-10 w-36 rounded-lg" />
    </div>
    <div v-else-if="variant === 'preview'" class="sncbt-skeleton-panel space-y-4">
      <USkeleton aria-hidden="true" class="h-5 w-48 rounded" />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <USkeleton aria-hidden="true" v-for="index in Math.min(rows, 6)" :key="index" class="h-36 rounded-xl" />
      </div>
    </div>
    <div v-else class="sncbt-skeleton-panel space-y-4">
      <template v-if="variant === 'report'">
        <USkeleton aria-hidden="true" class="h-6 w-64 max-w-full rounded" />
        <div class="grid gap-3 sm:grid-cols-3">
          <USkeleton aria-hidden="true" v-for="index in 3" :key="index" class="h-20 rounded-lg" />
        </div>
      </template>
      <template v-else>
        <div class="flex gap-3">
          <USkeleton aria-hidden="true" class="h-10 min-w-0 flex-1 rounded-lg" />
          <USkeleton aria-hidden="true" class="h-10 w-28 rounded-lg" />
        </div>
      </template>
      <div v-for="index in rows" :key="index" class="flex items-center gap-4 border-b border-default/60 py-2">
        <USkeleton aria-hidden="true" class="size-9 shrink-0 rounded-lg" />
        <div class="flex-1 space-y-2">
          <USkeleton aria-hidden="true" class="h-3 w-3/4 rounded" />
          <USkeleton aria-hidden="true" class="h-3 w-2/5 rounded" />
        </div>
      </div>
    </div>
  </section>
</template>
