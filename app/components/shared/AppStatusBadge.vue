<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    tone?: "neutral" | "primary" | "success" | "info" | "warning" | "error";
    dot?: boolean;
    quiet?: boolean;
  }>(),
  {
    tone: "neutral",
    dot: false,
    quiet: false,
  },
);

const toneClass = computed(() => `sncbt-status-badge--${props.tone}`);
</script>

<template>
  <span
    class="sncbt-status-badge"
    :class="[toneClass, quiet ? 'sncbt-status-badge--quiet' : '']"
  >
    <span v-if="dot" class="sncbt-status-badge__dot" aria-hidden="true" />
    <span>{{ label }}</span>
  </span>
</template>
