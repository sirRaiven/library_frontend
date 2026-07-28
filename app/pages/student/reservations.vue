<script setup lang="ts">
import StudentReservationCard from "~/components/student/StudentReservationCard.vue";
import type {
  ReservableStudentBook,
  StudentReservationRecord,
} from "~/composables/useStudentReservations";

const PAGE_SIZE = 10;

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "My Reservations",
});

const route = useRoute();
const router = useRouter();
const reservations = useStudentReservations();
const collection = useStudentBooks();
const toast = useToast();
const auth = useAuth();

const view = ref<"active" | "history">(
  route.query.view === "history" ? "history" : "active",
);
const page = ref(Math.max(1, Number(route.query.page) || 1));
const createOpen = ref(false);
const cancelOpen = ref(false);
const selectedForCancellation = ref<StudentReservationRecord | null>(null);
const bookSearch = ref("");
const selectedBooks = ref<ReservableStudentBook[]>([]);
const remarks = ref("");

const policy = computed(() => reservations.policy.value);
const selectedCount = computed(() => selectedBooks.value.length);
const remainingAfterSelection = computed(() =>
  Math.max(0, (policy.value?.remainingSlots ?? 0) - selectedCount.value),
);

const viewItems = [
  { label: "Active Reservations", value: "active", icon: "i-lucide-bookmark-check" },
  { label: "Reservation History", value: "history", icon: "i-lucide-history" },
];

function selected(book: ReservableStudentBook) {
  return selectedBooks.value.some(item => item.documentId === book.documentId);
}

function toggleBook(book: ReservableStudentBook) {
  if (selected(book)) {
    selectedBooks.value = selectedBooks.value.filter(
      item => item.documentId !== book.documentId,
    );
    return;
  }

  if (!book.canSelect) {
    toast.add({
      title: "Book cannot be selected",
      description: book.selectionReason || "This title is not currently eligible for reservation.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  if (selectedCount.value >= (policy.value?.remainingSlots ?? 0)) {
    toast.add({
      title: "Reservation limit reached",
      description: `You may select only ${policy.value?.remainingSlots ?? 0} more title${(policy.value?.remainingSlots ?? 0) === 1 ? "" : "s"}.`,
      color: "warning",
      icon: "i-lucide-list-x",
    });
    return;
  }

  selectedBooks.value.push(book);
}

async function syncRoute() {
  const query: Record<string, string> = {};
  if (view.value === "history") query.view = "history";
  if (page.value > 1) query.page = String(page.value);
  await router.replace({ query });
}

async function load() {
  try {
    await reservations.load(view.value, page.value);
    page.value = reservations.pagination.value.page;
  } catch (error) {
    toast.add({
      title: "Unable to load reservations",
      description: reservations.error.value || auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

async function changeView(next: string | number) {
  view.value = next === "history" ? "history" : "active";
  page.value = 1;
  await syncRoute();
  await load();
}

async function searchBooks() {
  if (bookSearch.value.trim().length < 2) return;
  try {
    await reservations.searchBooks(bookSearch.value);
  } catch (error) {
    toast.add({
      title: "Book search failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-search-x",
    });
  }
}

function resetCreateForm() {
  bookSearch.value = "";
  selectedBooks.value = [];
  remarks.value = "";
  reservations.clearBookSearch();
}

async function createReservations() {
  if (!selectedBooks.value.length) return;

  try {
    const result = await reservations.create(
      selectedBooks.value.map(book => book.documentId),
      remarks.value,
    );

    toast.add({
      title: result.created.length === 1
        ? "Reservation created"
        : `${result.created.length} reservations created`,
      description: result.failed.length
        ? `${result.failed.length} selected title${result.failed.length === 1 ? "" : "s"} could not be reserved and require review.`
        : "Your reservation request has been added to the Library queue.",
      color: result.failed.length ? "warning" : "success",
      icon: result.failed.length
        ? "i-lucide-triangle-alert"
        : "i-lucide-circle-check-big",
    });

    if (result.failed.length) {
      const failedIds = new Set(result.failed.map(item => item.bookDocumentId));
      selectedBooks.value = selectedBooks.value.filter(book => failedIds.has(book.documentId));
    } else {
      createOpen.value = false;
      resetCreateForm();
    }

    view.value = "active";
    page.value = 1;
    await syncRoute();
    await load();
  } catch (error) {
    toast.add({
      title: "Reservations were not created",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

function requestCancellation(record: StudentReservationRecord) {
  selectedForCancellation.value = record;
  cancelOpen.value = true;
}

async function confirmCancellation() {
  const record = selectedForCancellation.value;
  if (!record) return;

  try {
    await reservations.cancel(record.documentId);
    toast.add({
      title: "Reservation cancelled",
      description: `${record.reservationNo || "The reservation"} has been cancelled.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    cancelOpen.value = false;
    selectedForCancellation.value = null;
    await load();
  } catch (error) {
    toast.add({
      title: "Cancellation failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

watch(page, async (next, previous) => {
  if (next === previous || reservations.loading.value) return;
  await syncRoute();
  await load();
  if (import.meta.client) window.scrollTo({ top: 0, behavior: "smooth" });
});

watch(createOpen, open => {
  if (!open) resetCreateForm();
});

onMounted(async () => {
  await load();

  const requestedBook = String(route.query.book ?? "").trim();
  if (requestedBook) {
    createOpen.value = true;

    try {
      const book = await collection.loadBook(requestedBook);
      if (book) {
        bookSearch.value = book.title;
        const matches = await reservations.searchBooks(book.title);
        const requestedMatch = matches.find(
          item => item.documentId === requestedBook,
        );

        if (requestedMatch?.canSelect) {
          selectedBooks.value = [requestedMatch];
        }
      }
    } catch {
      // The reservation modal remains open so the student can search manually.
    }
  }
});
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <StudentPageHeader
      eyebrow="Library Services"
      title="My Reservations"
      description="Request book titles, monitor pickup status, and review your personal reservation history."
      icon="i-lucide-bookmark-check"
    >
      <template #actions>
        <UButton
          label="New Reservation"
          icon="i-lucide-calendar-plus"
          color="primary"
          :disabled="!policy?.canCreate"
          @click="createOpen = true"
        />
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="reservations.loading.value"
          @click="load"
        />
      </template>
    </StudentPageHeader>

    <UAlert
      v-if="policy && !policy.canCreate"
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="New reservations are currently unavailable"
      :description="policy.blockingReasons.join(' ')"
    />

    <UAlert
      v-else-if="policy"
      color="primary"
      variant="soft"
      icon="i-lucide-info"
      title="Reservation policy"
      :description="`You may have up to ${policy.maximumActiveReservations} active reservations. New requests expire after ${policy.expirationDays} day${policy.expirationDays === 1 ? '' : 's'} unless processed earlier.`"
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StudentMetricCard
        label="Active Reservations"
        :value="reservations.summary.value.activeCount"
        description="Pending, approved, or ready for pickup"
        icon="i-lucide-bookmark-check"
        tone="primary"
      />
      <StudentMetricCard
        label="Remaining Slots"
        :value="policy?.remainingSlots ?? 0"
        :description="`Maximum of ${policy?.maximumActiveReservations ?? 0} active reservations`"
        icon="i-lucide-list-plus"
        tone="success"
      />
      <StudentMetricCard
        label="Ready for Pickup"
        :value="reservations.summary.value.readyCount"
        description="Bring your Library Card when claiming"
        icon="i-lucide-package-check"
        tone="warning"
      />
      <StudentMetricCard
        label="History Records"
        :value="reservations.summary.value.historyCount"
        description="Completed, cancelled, and expired"
        icon="i-lucide-history"
        tone="neutral"
      />
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex w-full rounded-xl border border-default bg-elevated/40 p-1 sm:w-auto">
        <UButton
          v-for="item in viewItems"
          :key="item.value"
          :label="item.label"
          :icon="item.icon"
          :color="view === item.value ? 'primary' : 'neutral'"
          :variant="view === item.value ? 'solid' : 'ghost'"
          class="flex-1 sm:flex-none"
          @click="changeView(item.value)"
        />
      </div>
      <p class="text-sm text-muted">
        {{ reservations.pagination.value.total }} record{{ reservations.pagination.value.total === 1 ? '' : 's' }}
      </p>
    </div>

    <div v-if="reservations.loading.value && !reservations.records.value.length" class="space-y-4">
      <USkeleton v-for="index in 4" :key="index" class="h-56 w-full rounded-2xl" />
    </div>

    <UAlert
      v-else-if="reservations.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Reservations unavailable"
      :description="reservations.error.value"
    />

    <div v-else-if="reservations.records.value.length" class="space-y-4">
      <StudentReservationCard
        v-for="record in reservations.records.value"
        :key="record.documentId"
        :reservation="record"
        :cancelling="reservations.cancellingId.value === record.documentId"
        @cancel="requestCancellation"
      />
    </div>

    <UCard v-else :ui="{ body: 'p-10 sm:p-14' }">
      <div class="mx-auto max-w-lg text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-2xl bg-elevated text-muted">
          <UIcon :name="view === 'active' ? 'i-lucide-bookmark-x' : 'i-lucide-history'" class="size-8" />
        </div>
        <h2 class="mt-5 text-lg font-bold text-highlighted">
          {{ view === 'active' ? 'No active reservations' : 'No reservation history yet' }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          {{ view === 'active'
            ? 'Search the Book Collection and submit a reservation request for an eligible title.'
            : 'Completed, cancelled, and expired reservations will appear here.' }}
        </p>
        <UButton
          v-if="view === 'active' && policy?.canCreate"
          label="Create a Reservation"
          icon="i-lucide-calendar-plus"
          color="primary"
          class="mt-5"
          @click="createOpen = true"
        />
      </div>
    </UCard>

    <div v-if="reservations.pagination.value.pageCount > 1" class="flex justify-center border-t border-default pt-6">
      <UPagination
        v-model:page="page"
        :total="reservations.pagination.value.total"
        :items-per-page="PAGE_SIZE"
        :disabled="reservations.loading.value"
      />
    </div>
  </div>

  <UModal
    v-model:open="createOpen"
    :dismissible="!reservations.creating.value"
    :ui="{ content: 'sm:max-w-5xl max-h-[92dvh] overflow-y-auto' }"
  >
    <template #content>
      <div class="bg-default p-5 sm:p-7">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-highlighted">Create New Reservation</h2>
            <p class="mt-1 text-sm text-muted">
              Search and select multiple eligible book titles. Each title creates a separate reservation record.
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            square
            :disabled="reservations.creating.value"
            aria-label="Close reservation form"
            @click="createOpen = false"
          />
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <UCard>
            <p class="text-xs text-muted">Available reservation slots</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ policy?.remainingSlots ?? 0 }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted">Selected titles</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ selectedCount }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted">Slots after submission</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ remainingAfterSelection }}</p>
          </UCard>
        </div>

        <form class="mt-6 space-y-3" @submit.prevent="searchBooks">
          <div class="flex flex-col gap-3 sm:flex-row">
            <UInput
              v-model="bookSearch"
              icon="i-lucide-search"
              placeholder="Search title, author, ISBN, category, or call number"
              maxlength="120"
              autocomplete="off"
              class="min-w-0 flex-1"
            >
              <template #trailing><UKbd>Enter</UKbd></template>
            </UInput>
            <UButton
              type="submit"
              label="Search Books"
              icon="i-lucide-search"
              color="primary"
              :loading="reservations.searching.value"
              :disabled="bookSearch.trim().length < 2"
            />
          </div>
          <p class="text-xs text-muted">
            Search activity is recorded only after submission. Individual keystrokes are not collected.
          </p>
        </form>

        <div v-if="selectedBooks.length" class="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold text-highlighted">Selected Book Titles</h3>
              <p class="text-xs text-muted">Review the titles before submitting.</p>
            </div>
            <UBadge :label="`${selectedCount} selected`" color="primary" variant="soft" />
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              v-for="book in selectedBooks"
              :key="book.documentId"
              :label="book.title"
              icon="i-lucide-x"
              color="neutral"
              variant="soft"
              size="sm"
              @click="toggleBook(book)"
            />
          </div>
        </div>

        <div v-if="reservations.searching.value" class="mt-5 grid gap-3 sm:grid-cols-2">
          <USkeleton v-for="index in 6" :key="index" class="h-36 w-full" />
        </div>

        <div v-else-if="reservations.searchResults.value.length" class="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            v-for="book in reservations.searchResults.value"
            :key="book.documentId"
            type="button"
            class="rounded-2xl border p-4 text-left transition"
            :class="[
              selected(book)
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-default bg-default hover:border-primary/50 hover:bg-elevated/50',
              !book.canSelect ? 'cursor-not-allowed opacity-60' : '',
            ]"
            @click="toggleBook(book)"
          >
            <div class="flex items-start gap-3">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted">
                <UIcon :name="selected(book) ? 'i-lucide-book-check' : 'i-lucide-book-open'" class="size-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="line-clamp-2 text-sm font-semibold text-highlighted">{{ book.title }}</h3>
                    <p class="mt-1 text-xs text-muted">{{ book.author }}</p>
                  </div>
                  <UBadge
                    :label="selected(book) ? 'Selected' : book.canSelect ? 'Select' : 'Unavailable'"
                    :color="selected(book) ? 'primary' : book.canSelect ? 'success' : 'neutral'"
                    variant="soft"
                  />
                </div>
                <p class="mt-3 text-xs text-muted">
                  {{ book.availability.availableCopies }} of {{ book.availability.totalCopies }} physical copies available
                </p>
                <p v-if="book.selectionReason" class="mt-2 text-xs font-medium text-warning">
                  {{ book.selectionReason }}
                </p>
              </div>
            </div>
          </button>
        </div>

        <UTextarea
          v-model="remarks"
          label="Optional note to the Library"
          placeholder="Add only information relevant to this reservation request."
          maxlength="500"
          autoresize
          class="mt-6 w-full"
        />

        <div class="mt-6 flex flex-col-reverse gap-3 border-t border-default pt-5 sm:flex-row sm:justify-end">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            :disabled="reservations.creating.value"
            @click="createOpen = false"
          />
          <UButton
            :label="selectedCount === 1 ? 'Create 1 Reservation' : `Create ${selectedCount} Reservations`"
            icon="i-lucide-calendar-check-2"
            color="primary"
            :loading="reservations.creating.value"
            :disabled="!selectedCount || !policy?.canCreate"
            @click="createReservations"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="cancelOpen" :dismissible="!reservations.cancellingId.value">
    <template #content>
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <UIcon name="i-lucide-triangle-alert" class="size-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-highlighted">Cancel this reservation?</h2>
            <p class="mt-2 text-sm leading-relaxed text-muted">
              {{ selectedForCancellation?.reservationNo || 'This reservation' }} for
              <strong class="text-highlighted">{{ selectedForCancellation?.book.title }}</strong>
              will be removed from the active queue. This action cannot be undone from the Student Portal.
            </p>
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            label="Keep Reservation"
            color="neutral"
            variant="ghost"
            :disabled="Boolean(reservations.cancellingId.value)"
            @click="cancelOpen = false"
          />
          <UButton
            label="Cancel Reservation"
            icon="i-lucide-x-circle"
            color="error"
            :loading="Boolean(reservations.cancellingId.value)"
            @click="confirmCancellation"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
