<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    admin?: boolean;
  }>(),
  { admin: false },
);

const maintenance = useSystemMaintenance();

function formatExpectedEnd(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

const detail = computed(() => {
  if (props.admin) {
    return "Non-administrative portals are read-only until maintenance mode is turned off.";
  }
  const end = formatExpectedEnd(maintenance.status.value.expectedEndAt);
  return end
    ? `Only viewing is available. Expected completion: ${end}.`
    : "Only viewing of information is currently available.";
});
</script>

<template>
  <div
    v-if="maintenance.enabled.value"
    class="sncbt-maintenance-banner"
    role="status"
    aria-live="polite"
  >
    <div class="flex min-w-0 items-start gap-3">
      <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
        <UIcon name="i-lucide-construction" class="size-4.5" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-highlighted">
          {{ admin ? "Maintenance mode is active" : maintenance.status.value.message }}
        </p>
        <p class="mt-0.5 text-xs leading-5 text-muted">{{ detail }}</p>
      </div>
    </div>
  </div>
</template>
