<script setup lang="ts">
import type {
  PortalHistoryCategory,
  PortalHistoryScope,
  PortalHistorySort,
} from "~/composables/usePortalHistory";

definePageMeta({
  layout: "librarian",
  title: "History",
});

const history = usePortalHistory("librarian");
const toast = useToast();
const auth = useAuth();

const PAGE_SIZE = 15;
const searchInput = ref("");
const category = ref<PortalHistoryCategory>("all");
const scope = ref<PortalHistoryScope>("all");
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
  { label: "My Account Activity", value: "account" },
];

const scopeItems = [
  { label: "All Library Staff", value: "all" },
  { label: "Processed by Me", value: "mine" },
];

const sortItems = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
];

const summaryCards = computed(() => [
  {
    label: "All Records",
    value: history.summary.value.total,
    icon: "i-lucide-history",
    description: "Records matching the current filters",
  },
  {
    label: "Borrowing",
    value: history.summary.value.borrowing,
    icon: "i-lucide-book-up",
    description: "Books released to members",
  },
  {
    label: "Returns",
    value: history.summary.value.return,
    icon: "i-lucide-book-down",
    description: "Completed book returns",
  },
  {
    label: "Reservations",
    value: history.summary.value.reservation,
    icon: "i-lucide-bookmark-check",
    description: "Reservation records",
  },
  {
    label: "Fines",
    value: history.summary.value.fine,
    icon: "i-lucide-receipt-text",
    description: "Assessed and settled charges",
  },
  {
    label: "Library Visits",
    value: history.summary.value.visit,
    icon: "i-lucide-scan-line",
    description: "Recorded Library entries",
  },
]);

const hasFilters = computed(() =>
  Boolean(
    appliedSearch.value ||
      appliedDateFrom.value ||
      appliedDateTo.value ||
      category.value !== "all" ||
      scope.value !== "all" ||
      sort.value !== "newest",
  ),
);

async function load(showToast = false) {
  try {
    await history.load({
      search: appliedSearch.value,
      category: category.value,
      scope: scope.value,
      sort: sort.value,
      dateFrom: appliedDateFrom.value,
      dateTo: appliedDateTo.value,
      page: page.value,
      pageSize: PAGE_SIZE,
    });

    if (showToast) {
      toast.add({
        title: "History refreshed",
        description: "The latest Library activity records are now displayed.",
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
  scope.value = "all";
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
  <div class="sncbt-page-shell space-y-6">
    <LibrarianPageHeader
      eyebrow="Library Activity"
      title="History"
      description="Review borrowing, returns, reservations, fines, and Library visit records in one read-only timeline."
      icon="i-lucide-history"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="history.loading.value"
          @click="load(true)"
        />
      </template>
    </LibrarianPageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <LibrarianMetricCard
          v-for="card in summaryCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :description="card.description"
          :icon="card.icon"
          :tone="card.label === 'Critical' ? 'error' : card.label === 'Active Notices' ? 'success' : card.label === 'Resolved' ? 'neutral' : 'primary'"
        />
    </div>

    <UCard :ui="{ body: 'p-4 sm:p-5' }">
      <form class="space-y-4" @submit.prevent="applyFilters">
        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <UInput
            v-model="searchInput"
            icon="i-lucide-search"
            placeholder="Search member, book, or reference no."
            maxlength="120"
            autocomplete="off"
          />

          <USelect
            v-model="category"
            :items="categoryItems"
            icon="i-lucide-list-filter"
            aria-label="History category"
          />

          <USelect
            v-model="scope"
            :items="scopeItems"
            icon="i-lucide-users-round"
            aria-label="Staff scope"
          />

          <USelect
            v-model="sort"
            :items="sortItems"
            icon="i-lucide-arrow-up-down"
            aria-label="Sort history"
          />
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <UFormField label="From date">
            <UInput v-model="dateFrom" type="date" icon="i-lucide-calendar" />
          </UFormField>
          <UFormField label="To date">
            <UInput v-model="dateTo" type="date" icon="i-lucide-calendar" />
          </UFormField>

          <div class="flex items-end gap-2">
            <UButton
              type="submit"
              label="Apply Filters"
              icon="i-lucide-filter"
              color="primary"
              class="flex-1 lg:flex-none"
              :loading="history.loading.value"
            />
            <UButton
              v-if="hasFilters"
              type="button"
              label="Reset"
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="outline"
              @click="resetFilters"
            />
          </div>
        </div>
      </form>
    </UCard>

    <UAlert
      v-if="history.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="History records unavailable"
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
        show-member
        show-actor
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
          No Library activity matches the current search and date filters.
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
      icon="i-lucide-lock-keyhole"
      title="Read-only history"
      description="History records cannot be edited from this page. Corrections must be completed in the related Library service page and remain subject to the system audit trail."
    />
  </div>
</template>
