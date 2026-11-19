<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    description?: string;
    icon?: string;
  }>(),
  {
    eyebrow: "",
    description: "",
    icon: "i-lucide-library",
  },
);
</script>

<template>
  <header class="sncbt-page-hero sncbt-page-header">
    <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-3">
          <div
            v-if="icon"
            class="sncbt-page-icon hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex"
            aria-hidden="true"
          >
            <UIcon :name="icon" class="size-4.5" />
          </div>

          <div class="min-w-0">
            <p
              v-if="eyebrow"
              class="hidden text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-primary lg:block"
            >
              {{ eyebrow }}
            </p>
            <h1
              class="text-balance text-xl font-semibold tracking-tight text-highlighted sm:text-2xl"
              :class="eyebrow ? 'lg:mt-0.5' : ''"
            >
              {{ title }}
            </h1>
          </div>
        </div>

        <p
          v-if="description"
          class="mt-1.5 max-w-3xl text-sm leading-5 text-muted"
        >
          {{ description }}
        </p>
      </div>

      <div
        v-if="$slots.actions"
        class="sncbt-action-row sncbt-mobile-stack-actions min-w-0 lg:max-w-[60%] lg:justify-end"
      >
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
