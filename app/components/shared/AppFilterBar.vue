<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    activeCount?: number;
    mobileFiltersOpen?: boolean;
    showClear?: boolean;
  }>(),
  {
    title: "",
    description: "",
    activeCount: 0,
    mobileFiltersOpen: false,
    showClear: false,
  },
);

const emit = defineEmits<{
  "update:mobileFiltersOpen": [value: boolean];
  clear: [];
}>();

const localMobileFiltersOpen = ref(props.mobileFiltersOpen);
watch(() => props.mobileFiltersOpen, (value) => {
  localMobileFiltersOpen.value = value;
});
const resolvedMobileFiltersOpen = computed(() => props.mobileFiltersOpen || localMobileFiltersOpen.value);

const toggleMobileFilters = () => {
  const next = !resolvedMobileFiltersOpen.value;
  localMobileFiltersOpen.value = next;
  emit("update:mobileFiltersOpen", next);
};
</script>

<template>
  <section class="sncbt-filter-bar" aria-label="Search and filters">
    <div v-if="title || description" class="sncbt-filter-bar__heading">
      <div class="min-w-0">
        <h2 v-if="title" class="text-sm font-semibold text-highlighted">{{ title }}</h2>
        <p v-if="description" class="mt-0.5 text-xs leading-5 text-muted">{{ description }}</p>
      </div>
    </div>

    <div class="sncbt-filter-bar__primary">
      <div v-if="$slots.search" class="sncbt-filter-bar__search">
        <slot name="search" />
      </div>

      <div v-if="$slots.quick" class="sncbt-filter-bar__quick">
        <slot name="quick" />
      </div>

      <div class="sncbt-filter-bar__mobile-controls md:hidden">
        <UButton
          :label="activeCount > 0 ? `Filters (${activeCount})` : 'Filters'"
          icon="i-lucide-sliders-horizontal"
          color="neutral"
          variant="outline"
          size="sm"
          :aria-expanded="resolvedMobileFiltersOpen"
          @click="toggleMobileFilters"
        />
        <UButton
          v-if="showClear && activeCount > 0"
          label="Clear"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('clear')"
        />
      </div>

      <div v-if="$slots.actions" class="sncbt-filter-bar__actions">
        <slot name="actions" />
      </div>
    </div>

    <div
      v-if="$slots.filters"
      class="sncbt-filter-bar__advanced"
      :class="resolvedMobileFiltersOpen ? 'sncbt-filter-bar__advanced--open' : ''"
    >
      <slot name="filters" />
    </div>
  </section>
</template>
