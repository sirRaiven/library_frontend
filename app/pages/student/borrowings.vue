<script setup lang="ts">
import type { StudentBorrowingView } from "~/composables/useStudentBorrowings";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "My Borrowed Books",
  roleTitle: "Student",
});

const borrowings = useStudentBorrowings();
const toast = useToast();

const PAGE_SIZE = 10;
const view = ref<StudentBorrowingView>("current");
const page = ref(1);
const searchInput = ref("");
const appliedSearch = ref("");
const sort = ref("due-soon");

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

async function load() {
  try {
    await borrowings.load({
      view: view.value,
      search: appliedSearch.value,
      sort: sort.value,
      page: page.value,
    });
  } catch (error) {
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

  view.value = nextView;
  page.value = 1;
  sort.value = nextView === "history"
    ? "recently-completed"
    : "due-soon";
  await load();
}

async function applySearch() {
  appliedSearch.value = searchInput.value.trim();
  page.value = 1;
  await load();
}

async function clearSearch() {
  searchInput.value = "";
  appliedSearch.value = "";
  page.value = 1;
  await load();
}

watch(page, async (nextPage, previousPage) => {
  if (nextPage === previousPage) return;
  await load();
});

watch(sort, async (nextSort, previousSort) => {
  if (nextSort === previousSort) return;
  page.value = 1;
  await load();
});

onMounted(load);
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
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

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

    <UCard :ui="{ body: 'p-4 sm:p-5' }">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="inline-flex w-full rounded-xl border border-default bg-elevated/40 p-1 lg:w-auto">
            <UButton
              v-for="item in viewItems"
              :key="item.value"
              :label="item.label"
              :icon="item.icon"
              :color="view === item.value ? 'primary' : 'neutral'"
              :variant="view === item.value ? 'solid' : 'ghost'"
              class="flex-1 lg:flex-none"
              @click="changeView(item.value)"
            />
          </div>

          <p class="text-sm text-muted">
            {{ borrowings.pagination.value.total }} record{{ borrowings.pagination.value.total === 1 ? '' : 's' }}
          </p>
        </div>

        <form class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem_auto]" @submit.prevent="applySearch">
          <UInput
            v-model="searchInput"
            icon="i-lucide-search"
            placeholder="Search book title, author, ISBN, borrowing no., or physical copy"
            maxlength="120"
            autocomplete="off"
          >
            <template #trailing>
              <UKbd>Enter</UKbd>
            </template>
          </UInput>

          <USelect
            v-model="sort"
            :items="sortItems"
            icon="i-lucide-arrow-up-down"
            aria-label="Sort borrowing records"
          />

          <div class="flex gap-2">
            <UButton
              type="submit"
              label="Search"
              icon="i-lucide-search"
              color="primary"
              class="flex-1 lg:flex-none"
              :loading="borrowings.loading.value"
            />
            <UButton
              v-if="appliedSearch"
              label="Clear"
              icon="i-lucide-x"
              color="neutral"
              variant="outline"
              @click="clearSearch"
            />
          </div>
        </form>

        <p class="text-xs text-muted">
          Only submitted searches are recorded for system activity monitoring. The raw search phrase is not retained.
        </p>
      </div>
    </UCard>

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
            : view === 'current'
              ? 'Books issued to your Student account will appear here automatically.'
              : 'Completed, lost, and cancelled borrowing transactions will appear here.' }}
        </p>
        <UButton
          v-if="appliedSearch"
          label="Clear Search"
          icon="i-lucide-x"
          color="neutral"
          variant="outline"
          class="mt-5"
          @click="clearSearch"
        />
      </div>
    </UCard>

    <div
      v-if="borrowings.pagination.value.pageCount > 1"
      class="flex justify-center border-t border-default pt-6 mb-12"
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
      class="mb-12"
      :description="`${borrowings.notes.value.fineAmount} ${borrowings.notes.value.renewal}`"
    />
  </div>
</template>
