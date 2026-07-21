<script setup lang="ts">
import type {
  CirculationMember,
  ManagedReservation,
  ReservationBook,
  ReservationStatus,
} from "~/composables/useLibraryCirculation";

definePageMeta({
  layout: "librarian",
  title: "Reservations",
});

const circulation = useLibraryCirculation();
const auth = useAuth();
const toast = useToast();

const search = ref("");
const statusFilter = ref("All");
const page = ref(1);
const pageSize = ref(10);

const reservations = ref<ManagedReservation[]>(
  [],
);
const total = ref(0);
const pageCount = ref(1);

const isLoading = ref(false);
const isCreateOpen = ref(false);
const isSaving = ref(false);
const updatingReservationId =
  ref<string | null>(null);

const memberBarcode = ref("");
const reservationMember =
  ref<CirculationMember | null>(null);
const isLookingUpMember = ref(false);

const bookSearch = ref("");
const bookResults = ref<ReservationBook[]>(
  [],
);
const selectedBook =
  ref<ReservationBook | null>(null);
const isSearchingBooks = ref(false);

const remarks = ref("");

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultExpirationDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);

  return dateInputValue(date);
}

const expirationDate = ref(
  defaultExpirationDate(),
);

const statusOptions = [
  "All",
  "Pending",
  "Approved",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
  "Expired",
];

const activeCount = computed(
  () =>
    reservations.value.filter((item) =>
      [
        "Pending",
        "Approved",
        "Ready for Pickup",
      ].includes(item.status),
    ).length,
);

const readyCount = computed(
  () =>
    reservations.value.filter(
      (item) =>
        item.status === "Ready for Pickup",
    ).length,
);

const expiringCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextTwoDays = new Date(today);
  nextTwoDays.setDate(
    nextTwoDays.getDate() + 2,
  );

  return reservations.value.filter(
    (item) => {
      if (
        ![
          "Pending",
          "Approved",
          "Ready for Pickup",
        ].includes(item.status)
      ) {
        return false;
      }

      const expiration = new Date(
        `${item.expirationDate}T00:00:00`,
      );

      return (
        expiration >= today &&
        expiration <= nextTwoDays
      );
    },
  ).length;
});

const canCreateReservation = computed(
  () =>
    Boolean(reservationMember.value) &&
    Boolean(selectedBook.value) &&
    Boolean(expirationDate.value) &&
    reservationMember.value?.canBorrow !==
      false &&
    !isSaving.value,
);

function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

function statusColor(
  status: ReservationStatus,
):
  | "success"
  | "info"
  | "warning"
  | "error"
  | "neutral" {
  if (
    status === "Completed"
  ) {
    return "success";
  }

  if (
    status === "Ready for Pickup"
  ) {
    return "info";
  }

  if (
    status === "Pending" ||
    status === "Approved"
  ) {
    return "warning";
  }

  if (
    status === "Cancelled" ||
    status === "Expired"
  ) {
    return "error";
  }

  return "neutral";
}

function resetCreateForm() {
  memberBarcode.value = "";
  reservationMember.value = null;
  bookSearch.value = "";
  bookResults.value = [];
  selectedBook.value = null;
  expirationDate.value =
    defaultExpirationDate();
  remarks.value = "";
}

async function loadReservations() {
  isLoading.value = true;

  try {
    const result =
      await circulation.listReservations({
        search: search.value.trim(),
        status: statusFilter.value,
        page: page.value,
        pageSize: pageSize.value,
      });

    reservations.value = result.data;
    total.value =
      result.meta.pagination.total;
    pageCount.value =
      result.meta.pagination.pageCount;
  } catch (error) {
    toast.add({
      title: "Reservations unavailable",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    isLoading.value = false;
  }
}

async function lookupReservationMember() {
  const barcode = memberBarcode.value
    .trim()
    .toUpperCase();

  if (!barcode || isLookingUpMember.value) {
    return;
  }

  isLookingUpMember.value = true;

  try {
    reservationMember.value =
      await circulation.lookupMember(
        barcode,
      );

    if (
      !reservationMember.value.canBorrow
    ) {
      toast.add({
        title: "Member has restrictions",
        description:
          "The member is inactive, suspended, expired, or has reached the borrowing limit.",
        color: "warning",
        icon: "i-lucide-shield-alert",
      });
    }
  } catch (error) {
    reservationMember.value = null;

    toast.add({
      title: "Member was not found",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-user-round-x",
    });
  } finally {
    isLookingUpMember.value = false;
  }
}

async function searchBooksForReservation() {
  const term = bookSearch.value.trim();

  if (
    term.length < 2 ||
    isSearchingBooks.value
  ) {
    return;
  }

  isSearchingBooks.value = true;
  selectedBook.value = null;

  try {
    bookResults.value =
      await circulation.searchReservationBooks(
        term,
      );

    if (bookResults.value.length === 0) {
      toast.add({
        title: "No books found",
        description:
          "Try a different title, author, or ISBN.",
        color: "warning",
        icon: "i-lucide-search-x",
      });
    }
  } catch (error) {
    toast.add({
      title: "Book search failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    isSearchingBooks.value = false;
  }
}

function selectReservationBook(
  book: ReservationBook,
) {
  selectedBook.value = book;
}

async function createReservation() {
  if (
    !reservationMember.value ||
    !selectedBook.value ||
    !canCreateReservation.value
  ) {
    return;
  }

  isSaving.value = true;

  try {
    const result =
      await circulation.createReservation({
        memberType:
          reservationMember.value.type,
        memberDocumentId:
          reservationMember.value
            .documentId,
        bookDocumentId:
          selectedBook.value.documentId,
        expirationDate:
          expirationDate.value,
        remarks: remarks.value.trim(),
      });

    toast.add({
      title: "Reservation created",
      description: `${result.reservationNo} was added to the queue.`,
      color: "success",
      icon: "i-lucide-calendar-check-2",
    });

    isCreateOpen.value = false;
    resetCreateForm();
    page.value = 1;
    await loadReservations();
  } catch (error) {
    toast.add({
      title: "Reservation failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isSaving.value = false;
  }
}

function availableActions(
  status: ReservationStatus,
): Array<{
  label: string;
  status: ReservationStatus;
  icon: string;
  color:
    | "success"
    | "info"
    | "warning"
    | "error";
}> {
  if (status === "Pending") {
    return [
      {
        label: "Approve",
        status: "Approved",
        icon: "i-lucide-check",
        color: "success",
      },
      {
        label: "Cancel",
        status: "Cancelled",
        icon: "i-lucide-x",
        color: "error",
      },
    ];
  }

  if (status === "Approved") {
    return [
      {
        label: "Ready for Pickup",
        status: "Ready for Pickup",
        icon: "i-lucide-package-check",
        color: "info",
      },
      {
        label: "Cancel",
        status: "Cancelled",
        icon: "i-lucide-x",
        color: "error",
      },
    ];
  }

  if (
    status === "Ready for Pickup"
  ) {
    return [
      {
        label: "Complete",
        status: "Completed",
        icon: "i-lucide-circle-check-big",
        color: "success",
      },
      {
        label: "Cancel",
        status: "Cancelled",
        icon: "i-lucide-x",
        color: "error",
      },
    ];
  }

  return [];
}

async function updateStatus(
  reservation: ManagedReservation,
  nextStatus: ReservationStatus,
) {
  updatingReservationId.value =
    reservation.documentId;

  try {
    await circulation.updateReservationStatus(
      reservation.documentId,
      nextStatus,
    );

    toast.add({
      title: "Reservation updated",
      description: `${reservation.reservationNo} is now ${nextStatus}.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });

    await loadReservations();
  } catch (error) {
    toast.add({
      title: "Update failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    updatingReservationId.value = null;
  }
}

function submitSearch() {
  page.value = 1;
  void loadReservations();
}

watch(statusFilter, () => {
  page.value = 1;
  void loadReservations();
});

watch(page, () => {
  void loadReservations();
});

watch(isCreateOpen, (open) => {
  if (!open) {
    resetCreateForm();
  }
});

onMounted(() => {
  void loadReservations();
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div
      class="mx-auto max-w-7xl space-y-6"
    >
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div
            class="flex flex-wrap items-center gap-2"
          >
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Reservations
            </h1>

            <UBadge
              color="info"
              variant="soft"
            >
              Title-level queue
            </UBadge>
          </div>

          <p
            class="mt-1 max-w-3xl text-sm text-muted"
          >
            Create and manage student or faculty
            reservations without assigning a
            specific physical copy.
          </p>
        </div>

        <UButton
          label="New Reservation"
          icon="i-lucide-calendar-plus"
          color="success"
          class="self-start"
          @click="isCreateOpen = true"
        />
      </div>

      <div
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <UCard>
          <div
            class="flex items-center gap-4"
          >
            <div
              class="flex size-11 items-center justify-center rounded-xl bg-info/10 text-info"
            >
              <UIcon
                name="i-lucide-calendar-days"
                class="size-5"
              />
            </div>

            <div>
              <p
                class="text-2xl font-bold text-highlighted"
              >
                {{ total }}
              </p>
              <p class="text-sm text-muted">
                Total records
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div
            class="flex items-center gap-4"
          >
            <div
              class="flex size-11 items-center justify-center rounded-xl bg-warning/10 text-warning"
            >
              <UIcon
                name="i-lucide-clock"
                class="size-5"
              />
            </div>

            <div>
              <p
                class="text-2xl font-bold text-highlighted"
              >
                {{ activeCount }}
              </p>
              <p class="text-sm text-muted">
                Active on this page
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div
            class="flex items-center gap-4"
          >
            <div
              class="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success"
            >
              <UIcon
                name="i-lucide-package-check"
                class="size-5"
              />
            </div>

            <div>
              <p
                class="text-2xl font-bold text-highlighted"
              >
                {{ readyCount }}
              </p>
              <p class="text-sm text-muted">
                Ready for pickup
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div
            class="flex items-center gap-4"
          >
            <div
              class="flex size-11 items-center justify-center rounded-xl bg-error/10 text-error"
            >
              <UIcon
                name="i-lucide-timer-off"
                class="size-5"
              />
            </div>

            <div>
              <p
                class="text-2xl font-bold text-highlighted"
              >
                {{ expiringCount }}
              </p>
              <p class="text-sm text-muted">
                Expiring soon
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h2
                class="font-semibold text-highlighted"
              >
                Reservation Queue
              </h2>
              <p class="text-sm text-muted">
                Search, filter, and update the
                current queue.
              </p>
            </div>

            <div
              class="flex flex-col gap-3 sm:flex-row"
            >
              <form
                class="flex min-w-0 gap-2"
                @submit.prevent="submitSearch"
              >
                <UInput
                  v-model="search"
                  icon="i-lucide-search"
                  placeholder="Search member, book, or number"
                  class="w-full sm:w-72"
                />

                <UButton
                  type="submit"
                  icon="i-lucide-search"
                  color="neutral"
                  variant="soft"
                  square
                  aria-label="Search reservations"
                />
              </form>

              <USelect
                v-model="statusFilter"
                :items="statusOptions"
                icon="i-lucide-list-filter"
                class="w-full sm:w-52"
              />
            </div>
          </div>
        </template>

        <div
          v-if="isLoading"
          class="space-y-3"
        >
          <USkeleton
            v-for="item in 6"
            :key="item"
            class="h-20 w-full"
          />
        </div>

        <div
          v-else-if="reservations.length === 0"
          class="py-14 text-center"
        >
          <div
            class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted"
          >
            <UIcon
              name="i-lucide-calendar-x-2"
              class="size-7"
            />
          </div>

          <p
            class="mt-4 font-semibold text-highlighted"
          >
            No reservations found
          </p>
          <p
            class="mt-1 text-sm text-muted"
          >
            Create a reservation or adjust the
            current filters.
          </p>
        </div>

        <div
          v-else
          class="divide-y divide-default"
        >
          <article
            v-for="reservation in reservations"
            :key="reservation.documentId"
            class="grid gap-4 py-5 lg:grid-cols-[9rem_minmax(0,1.2fr)_minmax(0,1fr)_10rem_auto]"
          >
            <div>
              <p
                class="font-mono text-sm font-bold text-highlighted"
              >
                {{
                  reservation.reservationNo
                }}
              </p>
              <p
                class="mt-1 text-xs text-muted"
              >
                {{
                  formatDate(
                    reservation.reservationDate,
                  )
                }}
              </p>
            </div>

            <div class="min-w-0">
              <p
                class="truncate font-semibold text-highlighted"
              >
                {{ reservation.book.title }}
              </p>
              <p
                class="mt-1 truncate text-sm text-muted"
              >
                {{ reservation.book.author }}
              </p>
              <p
                v-if="
                  reservation.book.category
                "
                class="mt-2 text-xs text-muted"
              >
                {{
                  reservation.book.category
                }}
              </p>
            </div>

            <div class="min-w-0">
              <p
                class="truncate text-sm font-medium text-highlighted"
              >
                {{
                  reservation.member.fullName
                }}
              </p>
              <p
                class="mt-1 text-xs text-muted"
              >
                {{
                  reservation.member.type
                }}
                ·
                {{
                  reservation.member
                    .identifier
                }}
              </p>
            </div>

            <div>
              <p class="text-xs text-muted">
                Expires
              </p>
              <p
                class="mt-1 text-sm font-semibold text-highlighted"
              >
                {{
                  formatDate(
                    reservation.expirationDate,
                  )
                }}
              </p>
              <UBadge
                :color="
                  statusColor(
                    reservation.status,
                  )
                "
                variant="soft"
                class="mt-2"
              >
                {{ reservation.status }}
              </UBadge>
            </div>

            <div
              class="flex flex-wrap items-start gap-2 lg:justify-end"
            >
              <UButton
                v-for="action in availableActions(
                  reservation.status,
                )"
                :key="action.status"
                :label="action.label"
                :icon="action.icon"
                :color="action.color"
                variant="soft"
                size="sm"
                :loading="
                  updatingReservationId ===
                  reservation.documentId
                "
                :disabled="
                  updatingReservationId !==
                  null
                "
                @click="
                  updateStatus(
                    reservation,
                    action.status,
                  )
                "
              />
            </div>
          </article>
        </div>

        <template #footer>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-muted">
              Showing
              {{ reservations.length }} of
              {{ total }} reservations
            </p>

            <UPagination
              v-if="pageCount > 1"
              v-model:page="page"
              :total="total"
              :items-per-page="pageSize"
            />
          </div>
        </template>
      </UCard>
    </div>
  </UContainer>

  <UModal
    v-model:open="isCreateOpen"
    :dismissible="!isSaving"
    :ui="{
      content:
        'sm:max-w-3xl max-h-[90dvh] overflow-y-auto',
    }"
  >
    <template #content>
      <div class="bg-default p-6 sm:p-8">
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <h2
              class="text-xl font-bold text-highlighted"
            >
              Create Reservation
            </h2>
            <p
              class="mt-1 text-sm text-muted"
            >
              Verify the member, select a book,
              and set the pickup expiration.
            </p>
          </div>

          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            square
            aria-label="Close reservation form"
            :disabled="isSaving"
            @click="isCreateOpen = false"
          />
        </div>

        <div class="mt-6 space-y-6">
          <section
            class="rounded-2xl border border-default p-5"
          >
            <div
              class="flex items-center gap-3"
            >
              <div
                class="flex size-9 items-center justify-center rounded-xl bg-success/10 text-success"
              >
                <span
                  class="text-sm font-bold"
                >
                  1
                </span>
              </div>
              <div>
                <h3
                  class="font-semibold text-highlighted"
                >
                  Member
                </h3>
                <p
                  class="text-xs text-muted"
                >
                  Scan a student or faculty card.
                </p>
              </div>
            </div>

            <form
              class="mt-4 flex flex-col gap-3 sm:flex-row"
              @submit.prevent="
                lookupReservationMember
              "
            >
              <UInput
                v-model="memberBarcode"
                icon="i-lucide-id-card"
                placeholder="Member barcode"
                autocomplete="off"
                class="min-w-0 flex-1"
              />

              <UButton
                type="submit"
                label="Verify Member"
                icon="i-lucide-user-check"
                color="success"
                :loading="
                  isLookingUpMember
                "
                :disabled="
                  !memberBarcode.trim()
                "
              />
            </form>

            <div
              v-if="reservationMember"
              class="mt-4 flex items-start gap-4 rounded-xl bg-elevated p-4"
            >
              <UAvatar
                :alt="
                  reservationMember.fullName
                "
                :text="
                  reservationMember.fullName
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                "
                size="md"
              />

              <div class="min-w-0 flex-1">
                <div
                  class="flex flex-wrap items-center gap-2"
                >
                  <p
                    class="font-semibold text-highlighted"
                  >
                    {{
                      reservationMember.fullName
                    }}
                  </p>
                  <UBadge
                    :color="
                      reservationMember.canBorrow
                        ? 'success'
                        : 'warning'
                    "
                    variant="soft"
                  >
                    {{
                      reservationMember.canBorrow
                        ? "Verified"
                        : "Restricted"
                    }}
                  </UBadge>
                </div>

                <p
                  class="mt-1 text-sm text-muted"
                >
                  {{
                    reservationMember.type
                  }}
                  ·
                  {{
                    reservationMember.identifier
                  }}
                </p>
              </div>
            </div>
          </section>

          <section
            class="rounded-2xl border border-default p-5"
          >
            <div
              class="flex items-center gap-3"
            >
              <div
                class="flex size-9 items-center justify-center rounded-xl bg-info/10 text-info"
              >
                <span
                  class="text-sm font-bold"
                >
                  2
                </span>
              </div>
              <div>
                <h3
                  class="font-semibold text-highlighted"
                >
                  Book Title
                </h3>
                <p
                  class="text-xs text-muted"
                >
                  Reserve a title, not a specific
                  physical copy.
                </p>
              </div>
            </div>

            <form
              class="mt-4 flex flex-col gap-3 sm:flex-row"
              @submit.prevent="
                searchBooksForReservation
              "
            >
              <UInput
                v-model="bookSearch"
                icon="i-lucide-search"
                placeholder="Title, author, or ISBN"
                class="min-w-0 flex-1"
              />

              <UButton
                type="submit"
                label="Search Books"
                icon="i-lucide-search"
                color="info"
                :loading="
                  isSearchingBooks
                "
                :disabled="
                  bookSearch.trim().length < 2
                "
              />
            </form>

            <div
              v-if="bookResults.length"
              class="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <button
                v-for="book in bookResults"
                :key="book.documentId"
                type="button"
                class="rounded-xl border p-4 text-left transition"
                :class="
                  selectedBook?.documentId ===
                  book.documentId
                    ? 'border-success bg-success/5 ring-2 ring-success/20'
                    : 'border-default hover:bg-elevated'
                "
                @click="
                  selectReservationBook(
                    book,
                  )
                "
              >
                <p
                  class="line-clamp-2 font-semibold text-highlighted"
                >
                  {{ book.title }}
                </p>
                <p
                  class="mt-1 truncate text-sm text-muted"
                >
                  {{ book.author }}
                </p>
                <div
                  class="mt-3 flex flex-wrap gap-2"
                >
                  <UBadge
                    :color="
                      book.availableCopies > 0
                        ? 'success'
                        : 'warning'
                    "
                    variant="soft"
                  >
                    {{
                      book.availableCopies
                    }}
                    available
                  </UBadge>
                  <span
                    class="text-xs text-muted"
                  >
                    {{ book.totalCopies }}
                    total
                  </span>
                </div>
              </button>
            </div>
          </section>

          <section
            class="rounded-2xl border border-default p-5"
          >
            <div
              class="flex items-center gap-3"
            >
              <div
                class="flex size-9 items-center justify-center rounded-xl bg-warning/10 text-warning"
              >
                <span
                  class="text-sm font-bold"
                >
                  3
                </span>
              </div>
              <div>
                <h3
                  class="font-semibold text-highlighted"
                >
                  Pickup Details
                </h3>
                <p
                  class="text-xs text-muted"
                >
                  Set the reservation expiration.
                </p>
              </div>
            </div>

            <div
              class="mt-4 grid gap-4 sm:grid-cols-2"
            >
              <UFormField
                label="Expiration date"
                required
              >
                <UInput
                  v-model="expirationDate"
                  type="date"
                  icon="i-lucide-calendar-days"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Remarks"
                hint="Optional"
              >
                <UInput
                  v-model="remarks"
                  icon="i-lucide-message-square-text"
                  placeholder="Pickup or queue note"
                  class="w-full"
                />
              </UFormField>
            </div>
          </section>
        </div>

        <div
          class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            :disabled="isSaving"
            @click="isCreateOpen = false"
          />

          <UButton
            label="Create Reservation"
            icon="i-lucide-calendar-plus"
            color="success"
            :loading="isSaving"
            :disabled="
              !canCreateReservation
            "
            @click="createReservation"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
