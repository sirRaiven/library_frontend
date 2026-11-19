<script setup lang="ts">
/** A predictable route-level placeholder for all portal page types. */
const route = useRoute();
const pageKind = computed(() => {
  if (/dashboard|operations|system-health/.test(route.path)) return "dashboard";
  if (/create|register|edit|profile|settings|security|designer/.test(route.path)) return "form";
  return "records";
});
</script>

<template>
  <section class="sncbt-route-skeleton" role="status">
    <span class="sr-only">Loading Library page. Please wait.</span>
    <div class="sncbt-skeleton-heading">
      <div class="space-y-3">
        <USkeleton aria-hidden="true" class="h-3 w-28 rounded" />
        <USkeleton aria-hidden="true" class="h-8 w-56 max-w-[75vw] rounded-lg" />
        <USkeleton aria-hidden="true" class="h-3 w-64 max-w-[80vw] rounded" />
      </div>
      <USkeleton aria-hidden="true" class="hidden h-10 w-32 rounded-lg sm:block" />
    </div>

    <div v-if="pageKind === 'dashboard'" class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="index in 4" :key="index" class="sncbt-skeleton-panel space-y-4">
        <USkeleton aria-hidden="true" class="h-3 w-2/3 rounded" />
        <USkeleton aria-hidden="true" class="h-8 w-1/2 rounded" />
        <USkeleton aria-hidden="true" class="h-3 w-3/4 rounded" />
      </div>
    </div>

    <div v-else-if="pageKind === 'form'" class="sncbt-skeleton-panel mt-6 max-w-3xl space-y-5">
      <USkeleton aria-hidden="true" class="h-5 w-40 rounded" />
      <div v-for="index in 4" :key="index" class="space-y-2">
        <USkeleton aria-hidden="true" class="h-3 w-28 rounded" />
        <USkeleton aria-hidden="true" class="h-11 w-full rounded-lg" />
      </div>
      <USkeleton aria-hidden="true" class="h-10 w-36 rounded-lg" />
    </div>

    <div v-else class="sncbt-skeleton-panel mt-6 space-y-4">
      <div class="flex flex-wrap gap-3">
        <USkeleton aria-hidden="true" class="h-10 min-w-36 flex-1 rounded-lg" />
        <USkeleton aria-hidden="true" class="h-10 w-32 rounded-lg" />
      </div>
      <USkeleton aria-hidden="true" class="h-10 w-full rounded-lg" />
      <div v-for="index in 5" :key="index" class="flex items-center gap-4 border-b border-default/60 py-2">
        <USkeleton aria-hidden="true" class="size-9 shrink-0 rounded-lg" />
        <div class="flex-1 space-y-2">
          <USkeleton aria-hidden="true" class="h-3 w-2/3 rounded" />
          <USkeleton aria-hidden="true" class="h-3 w-1/3 rounded" />
        </div>
      </div>
    </div>

    <div v-if="pageKind === 'dashboard'" class="mt-5 grid gap-4 lg:grid-cols-2">
      <div v-for="index in 2" :key="index" class="sncbt-skeleton-panel space-y-4">
        <USkeleton aria-hidden="true" class="h-5 w-40 rounded" />
        <USkeleton aria-hidden="true" v-for="row in 4" :key="row" class="h-8 w-full rounded-lg" />
      </div>
    </div>
  </section>
</template>
