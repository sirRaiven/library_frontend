<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    to?: string;
    interactive?: boolean;
  }>(),
  {
    subtitle: "",
    to: undefined,
    interactive: false,
  },
);
</script>

<template>
  <article
    class="sncbt-record-card"
    :class="(to || interactive) ? 'sncbt-record-card--interactive' : ''"
  >
    <div class="sncbt-record-card__main">
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-start gap-2">
          <div class="min-w-0 flex-1">
            <NuxtLink v-if="to" :to="to" class="sncbt-record-card__title-link">
              {{ title }}
            </NuxtLink>
            <h3 v-else class="truncate text-sm font-semibold text-highlighted">{{ title }}</h3>
            <p v-if="subtitle" class="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{{ subtitle }}</p>
          </div>
          <div v-if="$slots.status" class="shrink-0">
            <slot name="status" />
          </div>
        </div>

        <div v-if="$slots.meta" class="sncbt-record-card__meta">
          <slot name="meta" />
        </div>
      </div>

      <div v-if="$slots.actions" class="sncbt-record-card__actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.footer" class="sncbt-record-card__footer">
      <slot name="footer" />
    </div>
  </article>
</template>
