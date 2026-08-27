<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    description: string;
    icon?: string;
  }>(),
  {
    eyebrow: "",
    icon: "i-lucide-library",
  },
);
</script>

<template>
  <header class="sncbt-page-hero p-5 sm:p-6 lg:p-7">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-start gap-4">
        <div
          class="sncbt-page-icon sncbt-icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12"
          aria-hidden="true"
        >
          <UIcon :name="icon" class="size-5" />
        </div>

        <div class="min-w-0">
          <p
            v-if="eyebrow"
            class="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
          >
            {{ eyebrow }}
          </p>
          <h1
            class="text-balance text-2xl font-semibold tracking-tight text-highlighted sm:text-[1.75rem]"
            :class="eyebrow ? 'mt-1' : ''"
          >
            {{ title }}
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {{ description }}
          </p>
        </div>
      </div>

      <div v-if="$slots.actions" class="sncbt-action-row sncbt-mobile-stack-actions shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
