<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
    headingId?: string;
  }>(),
  {
    description: "",
    icon: "",
    headingId: undefined,
  },
);
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <div class="flex items-center gap-2.5">
        <div
          v-if="icon"
          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
          aria-hidden="true"
        >
          <UIcon :name="icon" class="size-4" />
        </div>
        <div class="min-w-0">
          <h2 :id="headingId" class="text-base font-semibold tracking-tight text-highlighted">
            {{ title }}
          </h2>
          <p v-if="description" class="mt-0.5 max-w-3xl text-xs leading-5 text-muted">
            {{ description }}
          </p>
        </div>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
