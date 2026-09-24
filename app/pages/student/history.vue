<script setup lang="ts">
import type {
  PortalHistoryCategory,
  PortalHistorySort,
} from "~/composables/usePortalHistory";
import AppFilterBar from "~/components/shared/AppFilterBar.vue";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "My History",
  roleTitle: "Student",
});

const history = usePortalHistory("student");
const toast = useToast();
const auth = useAuth();

const PAGE_SIZE = 15;
const searchInput = ref("");
const category = ref<PortalHistoryCategory>("all");
const sort = ref<PortalHistorySort>("newest");
const dateFrom = ref("");
const dateTo = ref("");
const page = ref(1);
const appliedSearch = ref("");
const appliedDateFrom = ref("");
const appliedDateTo = ref("");

const categoryItems = [
  { label: "All Activities", value: "all" },
  { label: "Borrowing", value: "borrowing" },
  { label: "Returns", value: "return" },
  { label: "Reservations", value: "reservation" },
  { label: "Fines and Payments", value: "fine" },
  { label: "Library Visits", value: "visit" },
  { label: "Account Activity", value: "account" },
];

const sortItems = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
];

const metrics = computed(() => [
  {
    label: "Borrowing",
    value: history.summary.value.borrowing,
    description: "Books issued to your account",
    icon: "i-lucide-book-up",
    tone: "primary" as const,
  },
  {
    label: "Returns",
    value: history.summary.value.return,
    description: "Books returned to the Library",
    icon: "i-lucide-book-down",
    tone: "success" as const,
  },
  {
    label: "Reservations",
    value: history.summary.value.reservation,
    description: "Your reservation records",
    icon: "i-lucide-bookmark-check",
    tone: "neutral" as const,
  },
  {
    label: "Fines",
    value: history.summary.value.fine,
    description: "Fine and payment records",
    icon: "i-lucide-receipt-text",
    tone: history.summary.value.fine ? "warning" as const : "neutral" as const,
  },
  {
    label: "Library Visits",
    value: history.summary.value.visit,
    description: "Recorded Library entries",
    icon: "i-lucide-scan-line",
    tone: "neutral" as const,
  },
]);

const hasFilters = computed(() =>
  Boolean(
    appliedSearch.value ||
      appliedDateFrom.value ||
      appliedDateTo.value ||
      category.value !== "all" ||
      sort.value !== "newest",
  ),
);

async function load(showToast = false) {
  try {
    await history.load({
      search: appliedSearch.value,
      category: category.value,
      sort: sort.value,
      dateFrom: appliedDateFrom.value,
      dateTo: appliedDateTo.value,
      page: page.value,
      pageSize: PAGE_SIZE,
    });

    if (showToast) {
      toast.add({
        title: "History refreshed",
        description: "Your latest Library records are now displayed.",
        color: "success",
        icon: "i-lucide-refresh-cw",
      });
    }
  } catch (error) {
    toast.add({
      title: "History could not be loaded",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function applyFilters() {
  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    toast.add({
      title: "Check the selected dates",
      description: "The start date must be earlier than or equal to the end date.",
      color: "warning",
      icon: "i-lucide-calendar-alert",
    });
    return;
  }

  appliedSearch.value = searchInput.value.trim();
  appliedDateFrom.value = dateFrom.value;
  appliedDateTo.value = dateTo.value;
  page.value = 1;
  await load();
}

async function resetFilters() {
  searchInput.value = "";
  appliedSearch.value = "";
  category.value = "all";
  sort.value = "newest";
  dateFrom.value = "";
  dateTo.value = "";
  appliedDateFrom.value = "";
  appliedDateTo.value = "";
  page.value = 1;
  await load();
}

watch(page, async (current, previous) => {
  if (current !== previous) await load();
});

onMounted(load);
</script>

<template>
  <div class="sncbt-page-shell sncbt-member-page space-y-6">
    <StudentPageHeader
      eyebrow="Library Records"
      title="My History"
      description="Review your borrowing, return, reservation, fine, Library visit, and account records in one timeline."
      icon="i-lucide-history"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="primary"
          :loading="history.loading.value"
          @click="load(true)"
        />
      </template>
    </StudentPageHeader>

    <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
      <StudentMetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :description="metric.description"
        :icon="metric.icon"
        :tone="metric.tone"
      />
    </div>

    <form @submit.prevent="applyFilters">
      <AppFilterBar
        title="Filter history"
        :active-count="hasFilters ? 1 : 0"
        :show-clear="hasFilters"
        @clear="resetFilters"
      >
        <template #search>
          <UInput
            v-model="searchInput"
            icon="i-lucide-search"
            placeholder="Search book title or reference no."
            maxlength="120"
            autocomplete="off"
            class="w-full"
          />
        </template>

        <template #filters>
          <USelect
            v-model="category"
            :items="categoryItems"
            icon="i-lucide-list-filter"
            aria-label="History category"
            class="w-full md:w-52"
          />
          <USelect
            v-model="sort"
            :items="sortItems"
            icon="i-lucide-arrow-up-down"
            aria-label="Sort history"
            class="w-full md:w-48"
          />
          <UFormField label="From date" class="w-full md:w-44">
            <UInput v-model="dateFrom" type="date" icon="i-lucide-calendar" class="w-full" />
          </UFormField>
          <UFormField label="To date" class="w-full md:w-44">
            <UInput v-model="dateTo" type="date" icon="i-lucide-calendar" class="w-full" />
          </UFormField>
        </template>

        <template #actions>
          <UButton
            type="submit"
            label="Apply"
            icon="i-lucide-filter"
            color="primary"
            :loading="history.loading.value"
          />
        </template>
      </AppFilterBar>
    </form>

    <UAlert
      v-if="history.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="History unavailable"
      :description="history.error.value"
    />

    <div v-if="history.loading.value && !history.records.value.length" class="space-y-3">
      <USkeleton v-for="item in 5" :key="item" class="h-40 w-full rounded-2xl" />
    </div>

    <div v-else-if="history.records.value.length" class="space-y-3">
      <HistoryLogItem
        v-for="entry in history.records.value"
        :key="entry.id"
        :entry="entry"
        :show-member="false"
        :show-actor="false"
      />
    </div>

    <UCard v-else :ui="{ body: 'p-10 sm:p-14' }">
      <div class="mx-auto max-w-lg text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-2xl bg-elevated text-muted">
          <UIcon name="i-lucide-history" class="size-8" />
        </div>
        <h2 class="mt-5 text-lg font-bold text-highlighted">
          No history records found
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Your Library activities will appear here after borrowing, returning, reserving, or visiting the Library.
        </p>
        <UButton
          v-if="hasFilters"
          label="Reset Filters"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="outline"
          class="mt-5"
          @click="resetFilters"
        />
      </div>
    </UCard>

    <div
      v-if="history.pagination.value.pageCount > 1"
      class="flex flex-col gap-3 border-t border-default pt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-sm text-muted">
        {{ history.pagination.value.total }} record{{ history.pagination.value.total === 1 ? '' : 's' }}
      </p>
      <UPagination
        v-model:page="page"
        :total="history.pagination.value.total"
        :items-per-page="PAGE_SIZE"
        :disabled="history.loading.value"
      />
    </div>

    <UAlert
      color="neutral"
      variant="soft"
     
      icon="i-lucide-shield-check"
      title="Private account history"
      description="Only records connected to your Student account are shown on this page. Contact the Library if you notice an incorrect transaction."
    />
  </div>
</template>
