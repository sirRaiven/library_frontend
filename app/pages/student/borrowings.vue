<script setup lang="ts">
import AppFilterBar from "~/components/shared/AppFilterBar.vue";
import type {
  StudentBorrowingAttention,
  StudentBorrowingView,
} from "~/composables/useStudentBorrowings";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "My Borrowed Books",
  roleTitle: "Student",
});

const route = useRoute();
const router = useRouter();
const borrowings = useStudentBorrowings();
const toast = useToast();

const PAGE_SIZE = 10;

function queryText(name: string, maxLength = 120) {
  const value = route.query[name];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

const initialView: StudentBorrowingView =
  route.query.view === "history" ? "history" : "current";
const initialAttention = queryText("attention", 30);
const view = ref<StudentBorrowingView>(initialView);
const attention = ref<StudentBorrowingAttention>(
  initialView === "current" && ["overdue", "due-soon"].includes(initialAttention)
    ? (initialAttention as StudentBorrowingAttention)
    : "all",
);
const page = ref(Math.max(1, Number(route.query.page) || 1));
const searchInput = ref(queryText("search"));
const appliedSearch = ref(searchInput.value);
const requestedSort = queryText("sort", 40);
const validCurrentSorts = ["due-soon", "borrowed-newest", "borrowed-oldest"];
const validHistorySorts = ["recently-completed", "borrowed-newest", "borrowed-oldest"];
const sort = ref(
  (initialView === "history" ? validHistorySorts : validCurrentSorts).includes(requestedSort)
    ? requestedSort
    : initialView === "history"
      ? "recently-completed"
      : "due-soon",
);
let internalChange = false;

const viewItems: Array<{
  label: string;
  value: StudentBorrowingView;
  icon: string;
}> = [
  {
    label: "Current Loans",
    value: "current",
    icon: "i-lucide-book-open-check",
  },
  {
    label: "Borrowing History",
    value: "history",
    icon: "i-lucide-clock-arrow-up",
  },
];

const attentionItems: Array<{
  label: string;
  value: StudentBorrowingAttention;
  icon: string;
}> = [
  { label: "All Current", value: "all", icon: "i-lucide-list" },
  { label: "Overdue", value: "overdue", icon: "i-lucide-calendar-x" },
  { label: "Due Soon", value: "due-soon", icon: "i-lucide-alarm-clock" },
];

const sortItems = computed(() =>
  view.value === "history"
    ? [
        { label: "Recently completed", value: "recently-completed" },
        { label: "Borrowed newest", value: "borrowed-newest" },
        { label: "Borrowed oldest", value: "borrowed-oldest" },
      ]
    : [
        { label: "Due date: earliest", value: "due-soon" },
        { label: "Borrowed newest", value: "borrowed-newest" },
        { label: "Borrowed oldest", value: "borrowed-oldest" },
      ],
);

const activeFilterCount = computed(() =>
  Number(Boolean(appliedSearch.value)) +
  Number(view.value === "current" && attention.value !== "all"),
);

const resultAnnouncement = computed(() => {
  const total = borrowings.pagination.value.total;
  if (borrowings.loading.value) return "Loading borrowing records.";
  if (view.value === "history") {
    return `${total} borrowing history record${total === 1 ? "" : "s"} shown.`;
  }
  const label = attention.value === "overdue"
    ? "overdue loan"
    : attention.value === "due-soon"
      ? "loan due soon"
      : "current loan";
  return `${total} ${label}${total === 1 ? "" : "s"} shown.`;
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

async function syncRoute() {
  const query: Record<string, string> = {};
  if (view.value === "history") query.view = "history";
  if (view.value === "current" && attention.value !== "all") {
    query.attention = attention.value;
  }
  if (appliedSearch.value) query.search = appliedSearch.value;
  const defaultSort = view.value === "history" ? "recently-completed" : "due-soon";
  if (sort.value !== defaultSort) query.sort = sort.value;
  if (page.value > 1) query.page = String(page.value);
  await router.replace({ query });
}

async function load() {
  try {
    await borrowings.load({
      view: view.value,
      search: appliedSearch.value,
      sort: sort.value,
      attention: attention.value,
      page: page.value,
    });
    page.value = borrowings.pagination.value.page;
  } catch {
    toast.add({
      title: "Unable to load borrowing records",
      description: borrowings.error.value,
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

async function changeView(nextView: StudentBorrowingView) {
  if (view.value === nextView && page.value === 1) return;

  internalChange = true;
  view.value = nextView;
  attention.value = "all";
  page.value = 1;
  sort.value = nextView === "history" ? "recently-completed" : "due-soon";
  internalChange = false;
  await syncRoute();
  await load();
}

async function changeAttention(nextAttention: StudentBorrowingAttention) {
  if (view.value !== "current" || attention.value === nextAttention) return;
  attention.value = nextAttention;
  page.value = 1;
  await syncRoute();
  await load();
}

async function applySearch() {
  appliedSearch.value = searchInput.value.trim();
  page.value = 1;
  await syncRoute();
  await load();
}

async function clearSearch() {
  searchInput.value = "";
  appliedSearch.value = "";
  page.value = 1;
  await syncRoute();
  await load();
}

async function resetFilters() {
  searchInput.value = "";
  appliedSearch.value = "";
  attention.value = "all";
  page.value = 1;
  await syncRoute();
  await load();
}

watch(page, async (nextPage, previousPage) => {
  if (nextPage === previousPage || internalChange || borrowings.loading.value) return;
  await syncRoute();
  await load();
});

watch(sort, async (nextSort, previousSort) => {
  if (nextSort === previousSort || internalChange) return;
  page.value = 1;
  await syncRoute();
  await load();
});

onMounted(load);
</script>

<template>
  <div class="sncbt-page-shell sncbt-member-page space-y-6">
    <StudentPageHeader
      eyebrow="Library Circulation"
      title="My Borrowed Books"
      description="Review books currently issued to your account, important due dates, return records, and recorded fine assessments."
      icon="i-lucide-book-open-check"
    >
      <template #actions>
        <UButton
          to="/student/books"
          label="Browse Books"
          icon="i-lucide-book-open"
          color="primary"
          class="hidden lg:inline-flex"
        />
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="borrowings.loading.value"
          @click="load"
        />
      </template>
    </StudentPageHeader>

    <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
      <StudentMetricCard
        label="Currently Borrowed"
        :value="borrowings.summary.value.currentCount"
        description="Books still issued to your account"
        icon="i-lucide-book-open-check"
        tone="primary"
      />
      <StudentMetricCard
        label="Overdue"
        :value="borrowings.summary.value.overdueCount"
        description="Books already past the due date"
        icon="i-lucide-calendar-x"
        :tone="borrowings.summary.value.overdueCount ? 'error' : 'success'"
      />
      <StudentMetricCard
        label="Due Soon"
        :value="borrowings.summary.value.dueSoonCount"
        description="Due within the next three days"
        icon="i-lucide-alarm-clock"
        :tone="borrowings.summary.value.dueSoonCount ? 'warning' : 'neutral'"
      />
      <StudentMetricCard
        label="Returned Records"
        :value="borrowings.summary.value.returnedCount"
        description="Completed return transactions"
        icon="i-lucide-circle-check-big"
        tone="success"
      />
      <StudentMetricCard
        label="Recorded Fines"
        :value="formatCurrency(borrowings.summary.value.totalFineAssessed)"
        description="Historical assessed amount, not unpaid balance"
        icon="i-lucide-receipt-text"
        :tone="borrowings.summary.value.totalFineAssessed > 0 ? 'warning' : 'neutral'"
      />
    </div>

    <UAlert
      v-if="borrowings.summary.value.overdueCount > 0"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Overdue books require attention"
      :description="`${borrowings.summary.value.overdueCount} book${borrowings.summary.value.overdueCount === 1 ? ' is' : 's are'} already past the due date. Please return the physical book to the Library counter.`"
    />

    <form @submit.prevent="applySearch">
      <AppFilterBar
        :active-count="activeFilterCount"
        :show-clear="activeFilterCount > 0"
        @clear="resetFilters"
      >
        <template #quick>
          <div class="flex min-w-max flex-wrap gap-2">
            <div class="inline-flex rounded-lg border border-default bg-elevated/40 p-1" aria-label="Borrowing record view">
              <UButton
                v-for="item in viewItems"
                :key="item.value"
                :label="item.label"
                :icon="item.icon"
                :color="view === item.value ? 'primary' : 'neutral'"
                :variant="view === item.value ? 'solid' : 'ghost'"
                :aria-pressed="view === item.value"
                size="sm"
                @click="changeView(item.value)"
              />
            </div>
            <div
              v-if="view === 'current'"
              class="inline-flex rounded-lg border border-default bg-elevated/40 p-1"
              aria-label="Current loan attention filter"
            >
              <UButton
                v-for="item in attentionItems"
                :key="item.value"
                :label="item.label"
                :icon="item.icon"
                :color="attention === item.value ? 'primary' : 'neutral'"
                :variant="attention === item.value ? 'soft' : 'ghost'"
                :aria-pressed="attention === item.value"
                size="sm"
                @click="changeAttention(item.value)"
              />
            </div>
          </div>
        </template>

        <template #search>
          <UInput
            v-model="searchInput"
            icon="i-lucide-search"
            placeholder="Search title, author, ISBN, borrowing no., or copy"
            maxlength="120"
            autocomplete="off"
            aria-label="Search borrowing records"
            class="w-full"
          />
        </template>

        <template #filters>
          <USelect
            v-model="sort"
            :items="sortItems"
            icon="i-lucide-arrow-up-down"
            aria-label="Sort borrowing records"
            class="w-full md:w-56"
          />
        </template>

        <template #actions>
          <UButton
            type="submit"
            label="Search"
            icon="i-lucide-search"
            color="primary"
            :loading="borrowings.loading.value"
          />
        </template>
      </AppFilterBar>
    </form>

    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ resultAnnouncement }}</p>

    <UAlert
      v-if="borrowings.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Borrowing records unavailable"
      :description="borrowings.error.value"
    />

    <div v-if="borrowings.loading.value && !borrowings.records.value.length" class="space-y-4">
      <USkeleton v-for="index in 4" :key="index" class="h-72 w-full rounded-2xl" />
    </div>

    <div v-else-if="borrowings.records.value.length" class="space-y-4">
      <StudentBorrowingCard
        v-for="record in borrowings.records.value"
        :key="record.documentId"
        :borrowing="record"
      />
    </div>

    <UCard v-else :ui="{ body: 'p-10 sm:p-14' }">
      <div class="mx-auto max-w-lg text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-2xl bg-elevated text-muted">
          <UIcon
            :name="view === 'current' ? 'i-lucide-book-check' : 'i-lucide-clock-arrow-up'"
            class="size-8"
          />
        </div>
        <h2 class="mt-5 text-lg font-bold text-highlighted">
          {{ view === 'current' ? 'No books are currently borrowed' : 'No borrowing history found' }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          {{ appliedSearch
            ? 'No record matches the submitted search.'
            : attention === 'overdue'
              ? 'No overdue books are currently recorded on your account.'
              : attention === 'due-soon'
                ? 'No borrowed books are due within the next three days.'
                : view === 'current'
                  ? 'Books issued to your Student account will appear here automatically.'
                  : 'Completed, lost, and cancelled borrowing transactions will appear here.' }}
        </p>
        <UButton
          v-if="activeFilterCount"
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
      v-if="borrowings.pagination.value.pageCount > 1"
      class="flex justify-center border-t border-default pt-6"
    >
      <UPagination
        v-model:page="page"
        :total="borrowings.pagination.value.total"
        :items-per-page="PAGE_SIZE"
        :disabled="borrowings.loading.value"
      />
    </div>

    <UAlert
      color="neutral"
      variant="soft"
      icon="i-lucide-info"
      title="About fines and renewals"
     
      :description="`${borrowings.notes.value.fineAmount} ${borrowings.notes.value.renewal}`"
    />
  </div>
</template>
