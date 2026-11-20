<script setup lang="ts">
import type { LibrarianWorkspace } from "~/composables/useLibrarianWorkspace";

const view = defineModel<LibrarianWorkspace>({ required: true });
const props = defineProps<{
  workLabel: string;
  recordsLabel: string;
}>();

const recordsOpened = ref(view.value === "records");
watch(view, (value) => {
  if (value === "records") recordsOpened.value = true;
});

const tabs = computed(() => [
  { label: props.workLabel, value: "work", slot: "work" },
  { label: props.recordsLabel, value: "records", slot: "records" },
]);
</script>

<template>
  <UTabs
    :model-value="view"
    :items="tabs"
    :unmount-on-hide="false"
    activation-mode="manual"
    variant="link"
    class="min-w-0 gap-4"
    :ui="{
      list: 'w-full justify-start gap-x-3 border-default sm:gap-x-5',
      trigger: 'flex-none min-h-11 px-2 text-sm sm:px-3',
      content: 'min-w-0 data-[state=inactive]:hidden',
    }"
    @update:model-value="view = $event === 'records' ? 'records' : 'work'"
  >
    <template #work>
      <div v-if="view === 'work'" class="space-y-4">
        <slot name="work" />
      </div>
    </template>
    <template #records>
      <div v-if="recordsOpened">
        <slot name="records" />
      </div>
    </template>
  </UTabs>
</template>
