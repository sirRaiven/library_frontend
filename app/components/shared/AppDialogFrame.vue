<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
    tone?: "neutral" | "primary" | "success" | "info" | "warning" | "error";
  }>(),
  {
    description: "",
    icon: "",
    tone: "neutral",
  },
);
</script>

<template>
  <div class="sncbt-dialog-frame">
    <header class="sncbt-dialog-frame__header">
      <div
        v-if="icon"
        class="sncbt-dialog-frame__icon"
        :class="`sncbt-dialog-frame__icon--${tone}`"
        aria-hidden="true"
      >
        <UIcon :name="icon" class="size-5" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold tracking-tight text-highlighted">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm leading-6 text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.headerActions" class="shrink-0">
        <slot name="headerActions" />
      </div>
    </header>

    <div class="sncbt-dialog-frame__body">
      <slot />
    </div>

    <footer v-if="$slots.actions" class="sncbt-dialog-frame__footer">
      <slot name="actions" />
    </footer>
  </div>
</template>
