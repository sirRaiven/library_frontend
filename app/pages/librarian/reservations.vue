<script setup lang="ts">
import type {
  CirculationMember,
  ManagedReservation,
  ReservationBook,
  ReservationStatus,
} from "~/composables/useLibraryCirculation";
import LiveBarcodeScanner from "~/components/librarian/visits/LiveBarcodeScanner.vue";
import type { BarcodeScanResult } from "~/composables/useBarcodeScanResult";

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
const queueSummary = ref({
  totalCount: 0,
  activeCount: 0,
  pendingCount: 0,
  readyCount: 0,
  expiringCount: 0,
});

const isLoading = ref(false);
const isCreateOpen = ref(false);
const isSaving = ref(false);
const updatingReservationId =
  ref<string | null>(null);
const isStatusConfirmOpen = ref(false);
const pendingStatusAction = ref<{
  reservation: ManagedReservation;
  nextStatus: ReservationStatus;
} | null>(null);

const isCheckoutOpen = ref(false);
const selectedCheckoutReservation =
  ref<ManagedReservation | null>(null);
const checkoutCopyBarcode = ref("");
const checkoutDueDate = ref("");
const checkoutRemarks = ref("");
const isCheckingOut = ref(false);

const memberBarcode = ref("");
const reservationMember =
  ref<CirculationMember | null>(null);
const isLookingUpMember = ref(false);

const bookSearch = ref("");
const bookResults = ref<ReservationBook[]>(
  [],
);
const selectedBooks = ref<ReservationBook[]>(
  [],
);
const isSearchingBooks = ref(false);
const isLookingUpBookBarcode = ref(false);

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

const activeCount = computed(() => queueSummary.value.activeCount);
const readyCount = computed(() => queueSummary.value.readyCount);
const expiringCount = computed(() => queueSummary.value.expiringCount);

const statusConfirmationTitle = computed(() => {
  const action = pendingStatusAction.value;
  if (!action) return "Update reservation";
  return action.nextStatus === "Cancelled"
    ? "Cancel reservation?"
    : `Mark as ${action.nextStatus}?`;
});

const statusConfirmationDescription = computed(() => {
  const action = pendingStatusAction.value;
  if (!action) return "";
  const reservation = action.reservation;
  const actionText =
    action.nextStatus === "Cancelled"
      ? "cancel"
      : `change the status to ${action.nextStatus}`;
  return `You are about to ${actionText} for ${reservation.reservationNo}. This change will immediately appear in the member's portal.`;
});

const selectedBookCount = computed(
  () => selectedBooks.value.length,
);

const createButtonLabel = computed(() =>
  selectedBookCount.value === 1
    ? "Create 1 Reservation"
    : `Create ${selectedBookCount.value} Reservations`,
);

const canCreateReservation = computed(
  () =>
    Boolean(reservationMember.value) &&
    selectedBookCount.value > 0 &&
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
  selectedBooks.value = [];
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

    const fallbackActive = result.data.filter((item) =>
      ["Pending", "Approved", "Ready for Pickup"].includes(item.status),
    ).length;
    queueSummary.value = result.meta.summary ?? {
      totalCount: result.meta.pagination.total,
      activeCount: fallbackActive,
      pendingCount: result.data.filter((item) => item.status === "Pending").length,
      readyCount: result.data.filter((item) => item.status === "Ready for Pickup").length,
      expiringCount: 0,
    };
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
    const previousMemberId =
      reservationMember.value?.documentId;

    const verifiedMember =
      await circulation.lookupMember(
        barcode,
      );

    reservationMember.value =
      verifiedMember;

    if (
      previousMemberId &&
      previousMemberId !==
        verifiedMember.documentId
    ) {
      selectedBooks.value = [];
    }

    if (
      !verifiedMember.canBorrow
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

function isBookSelected(
  book: ReservationBook,
): boolean {
  return selectedBooks.value.some(
    (selected) =>
      selected.documentId === book.documentId,
  );
}

function addReservationBook(
  book: ReservationBook,
  options: {
    showToast?: boolean;
  } = {},
) {
  if (isBookSelected(book)) {
    if (options.showToast !== false) {
      toast.add({
        title: "Book already selected",
        description:
          `${book.title} is already included in this reservation request.`,
        color: "info",
        icon: "i-lucide-copy-check",
      });
    }

    return false;
  }

  selectedBooks.value.push(book);

  if (options.showToast !== false) {
    toast.add({
      title: "Book added",
      description:
        `${book.title} was added to the selected books.`,
      color: "success",
      icon: "i-lucide-book-plus",
    });
  }

  return true;
}

function toggleReservationBook(
  book: ReservationBook,
) {
  if (isBookSelected(book)) {
    selectedBooks.value =
      selectedBooks.value.filter(
        (selected) =>
          selected.documentId !==
          book.documentId,
      );

    return;
  }

  addReservationBook(book, {
    showToast: false,
  });
}

function removeReservationBook(
  documentId: string,
) {
  selectedBooks.value =
    selectedBooks.value.filter(
      (book) =>
        book.documentId !== documentId,
    );
}

async function handleMemberCameraDetected(
  result: BarcodeScanResult,
) {
  const barcode = result.value
    .trim()
    .toUpperCase();

  if (
    !barcode ||
    isLookingUpMember.value ||
    isSaving.value
  ) {
    return;
  }

  memberBarcode.value = barcode;
  await nextTick();
  await lookupReservationMember();
}

async function handleBookCameraDetected(
  result: BarcodeScanResult,
) {
  const barcode = result.value
    .trim()
    .toUpperCase();

  if (
    !barcode ||
    isLookingUpBookBarcode.value ||
    isSearchingBooks.value ||
    isSaving.value
  ) {
    return;
  }

  isLookingUpBookBarcode.value = true;
  bookSearch.value = barcode;

  try {
    const physicalCopy =
      await circulation.lookupCopy(barcode);

    const bookDocumentId =
      physicalCopy.book.documentId;

    const matchingBooks =
      await circulation.searchReservationBooks(
        physicalCopy.book.title,
      );

    const matchedBook =
      matchingBooks.find(
        (book) =>
          book.documentId ===
          bookDocumentId,
      ) ??
      matchingBooks.find(
        (book) =>
          book.title.trim().toLowerCase() ===
            physicalCopy.book.title
              .trim()
              .toLowerCase() &&
          book.author.trim().toLowerCase() ===
            physicalCopy.book.author
              .trim()
              .toLowerCase(),
      ) ??
      matchingBooks[0];

    const reservationBook:
      ReservationBook | null =
      matchedBook ??
      (bookDocumentId
        ? {
            documentId: bookDocumentId,
            title:
              physicalCopy.book.title,
            author:
              physicalCopy.book.author,
            category:
              physicalCopy.book.category,
            totalCopies: 1,
            availableCopies:
              physicalCopy.available
                ? 1
                : 0,
          }
        : null);

    if (!reservationBook) {
      throw new Error(
        "The physical copy exists, but its book title record could not be identified.",
      );
    }

    bookResults.value =
      matchingBooks.length > 0
        ? matchingBooks
        : [reservationBook];

    addReservationBook(
      reservationBook,
      {
        showToast: false,
      },
    );

    toast.add({
      title: "Physical book found",
      description:
        `${reservationBook.title} was added using ${
          physicalCopy.controlNumber ||
          physicalCopy.accessionNumber ||
          barcode
        }.`,
      color: "success",
      icon: "i-lucide-scan-barcode",
    });
  } catch (error) {
    toast.add({
      title: "Physical book was not found",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-book-x",
    });
  } finally {
    isLookingUpBookBarcode.value = false;
  }
}

async function createReservation() {
  if (
    !reservationMember.value ||
    selectedBooks.value.length === 0 ||
    !canCreateReservation.value
  ) {
    return;
  }

  const member =
    reservationMember.value;

  isSaving.value = true;

  const booksToCreate = [
    ...selectedBooks.value,
  ];
  const created: Array<{
    book: ReservationBook;
    reservationNo: string;
  }> = [];
  const failed: Array<{
    book: ReservationBook;
    message: string;
  }> = [];

  try {
    for (const book of booksToCreate) {
      try {
        const result =
          await circulation.createReservation({
            memberType:
              member.type,
            memberDocumentId:
              member.documentId,
            bookDocumentId:
              book.documentId,
            expirationDate:
              expirationDate.value,
            remarks: remarks.value.trim(),
          });

        created.push({
          book,
          reservationNo:
            result.reservationNo,
        });
      } catch (error) {
        failed.push({
          book,
          message:
            auth.getErrorMessage(error),
        });
      }
    }

    if (created.length > 0) {
      toast.add({
        title:
          created.length === 1
            ? "Reservation created"
            : `${created.length} reservations created`,
        description:
          created.length === 1
            ? `${created[0]?.reservationNo} was added to the queue.`
            : `${created.length} selected book titles were added to the reservation queue.`,
        color: "success",
        icon: "i-lucide-calendar-check-2",
      });

      page.value = 1;
      await loadReservations();
    }

    if (failed.length === 0) {
      isCreateOpen.value = false;
      resetCreateForm();
      return;
    }

    selectedBooks.value =
      failed.map((item) => item.book);

    toast.add({
      title:
        created.length > 0
          ? "Some reservations were not created"
          : "Reservations were not created",
      description:
        `${failed.length} ${
          failed.length === 1
            ? "book needs"
            : "books need"
        } review. ${failed
          .slice(0, 2)
          .map(
            (item) =>
              `${item.book.title}: ${item.message}`,
          )
          .join(" • ")}`,
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    isSaving.value = false;
  }
}

function defaultCheckoutDueDate(
  memberType: "Student" | "Faculty",
): string {
  const date = new Date();
  date.setDate(
    date.getDate() +
      (memberType === "Student" ? 7 : 14),
  );
  return dateInputValue(date);
}

function openReservedCheckout(
  reservation: ManagedReservation,
) {
  selectedCheckoutReservation.value = reservation;
  checkoutCopyBarcode.value = "";
  checkoutDueDate.value = defaultCheckoutDueDate(
    reservation.member.type,
  );
  checkoutRemarks.value =
    `Checked out from reservation ${reservation.reservationNo}.`;
  isCheckoutOpen.value = true;
}

async function handleCheckoutBarcodeDetected(
  result: BarcodeScanResult,
) {
  if (isCheckingOut.value) return;
  checkoutCopyBarcode.value = result.value
    .trim()
    .toUpperCase();
}

async function confirmReservedCheckout() {
  const reservation = selectedCheckoutReservation.value;
  const copyBarcode = checkoutCopyBarcode.value
    .trim()
    .toUpperCase();

  if (!reservation || !copyBarcode || isCheckingOut.value) {
    return;
  }

  isCheckingOut.value = true;

  try {
    const result = await circulation.checkoutReservation(
      reservation.documentId,
      {
        copyBarcode,
        dueDate: checkoutDueDate.value || undefined,
        remarks: checkoutRemarks.value.trim() || undefined,
      },
    );

    toast.add({
      title: "Reserved book checked out",
      description: `${result.transaction.title} was issued under ${result.transaction.borrowNo}. The reservation is now Completed.`,
      color: "success",
      icon: "i-lucide-book-check",
    });

    isCheckoutOpen.value = false;
    selectedCheckoutReservation.value = null;
    checkoutCopyBarcode.value = "";
    await loadReservations();
  } catch (error) {
    toast.add({
      title: "Checkout failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isCheckingOut.value = false;
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

  if (status === "Ready for Pickup") {
    return [
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

function requestStatusUpdate(
  reservation: ManagedReservation,
  nextStatus: ReservationStatus,
) {
  if (updatingReservationId.value) return;
  pendingStatusAction.value = { reservation, nextStatus };
  isStatusConfirmOpen.value = true;
}

async function confirmStatusUpdate() {
  const action = pendingStatusAction.value;
  if (!action || updatingReservationId.value) return;

  const { reservation, nextStatus } = action;
  updatingReservationId.value = reservation.documentId;

  try {
    const updated = await circulation.updateReservationStatus(
      reservation.documentId,
      nextStatus,
    );

    const index = reservations.value.findIndex(
      (item) => item.documentId === reservation.documentId,
    );
    if (index >= 0) {
      reservations.value[index] = {
        ...reservations.value[index]!,
        status: updated.status,
      };
    }

    isStatusConfirmOpen.value = false;
    pendingStatusAction.value = null;

    toast.add({
      title: "Reservation updated",
      description: `${reservation.reservationNo} is now ${updated.status}.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });

    await loadReservations();
  } catch (error) {
    toast.add({
      title: "Update failed",
      description: auth.getErrorMessage(error),
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
      class="mx-auto max-w-[1600px] space-y-6"
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
          @click="() => { isCreateOpen = true }"
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
                {{ queueSummary.totalCount }}
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
                Active reservations
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

              <p
                v-if="reservation.checkout?.borrowTransaction"
                class="mt-2 text-xs text-success"
              >
                Borrowed as
                {{ reservation.checkout.borrowTransaction.borrowNo }}
              </p>
            </div>

            <div
              class="flex flex-wrap items-start gap-2 lg:justify-end"
            >
              <UButton
                v-if="reservation.checkout?.required"
                :label="
                  reservation.checkout?.legacyMissingBorrow
                    ? 'Create Missing Borrow Record'
                    : 'Checkout Reserved Book'
                "
                icon="i-lucide-book-check"
                color="success"
                variant="solid"
                size="sm"
                :disabled="updatingReservationId !== null || isCheckingOut"
                @click="openReservedCheckout(reservation)"
              />

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
                  requestStatusUpdate(
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

  <UModal v-model:open="isCheckoutOpen">
    <template #content>
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <UIcon name="i-lucide-book-check" class="size-5" />
          </div>
          <div class="min-w-0">
            <h2 class="text-lg font-bold text-highlighted">
              {{
                selectedCheckoutReservation?.checkout?.legacyMissingBorrow
                  ? "Create Missing Borrow Record"
                  : "Checkout Reserved Book"
              }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              Scan one available physical copy of the reserved title. The system will create the missing Borrow Transaction and connect it to the reservation.
            </p>
          </div>
        </div>

        <div v-if="selectedCheckoutReservation" class="mt-5 rounded-xl border border-default bg-elevated/50 p-4">
          <p class="font-semibold text-highlighted">
            {{ selectedCheckoutReservation.book.title }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ selectedCheckoutReservation.member.fullName }} ·
            {{ selectedCheckoutReservation.reservationNo }}
          </p>
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-highlighted">
              Physical book barcode
            </label>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UInput
                v-model="checkoutCopyBarcode"
                placeholder="Scan control or accession number"
                icon="i-lucide-barcode"
                size="lg"
                autocomplete="off"
                class="min-w-0 flex-1"
                @keyup.enter="confirmReservedCheckout"
              />
              <LiveBarcodeScanner
                :disabled="isCheckingOut"
                title="Scan Reserved Book Copy"
                button-label="Use Camera"
                ready-description="Place the physical copy barcode inside the guide."
                processing-label="Reading book barcode"
                processing-description="The barcode will be verified during checkout."
                storage-key="sncbt-reservation-checkout-camera"
                :duplicate-cooldown-ms="5000"
                :detection-hold-ms="800"
                @detected="handleCheckoutBarcodeDetected"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Due date" required>
              <UInput v-model="checkoutDueDate" type="date" />
            </UFormField>
            <UFormField label="Transaction remarks">
              <UInput
                v-model="checkoutRemarks"
                placeholder="Optional checkout note"
                icon="i-lucide-message-square-text"
              />
            </UFormField>
          </div>

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Checkout completes the reservation"
            description="The system will verify member eligibility, create the Borrow Transaction, mark the physical copy as Borrowed, and then set the reservation to Completed."
          />
        </div>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="isCheckingOut"
            @click="isCheckoutOpen = false"
          />
          <UButton
            label="Confirm Checkout"
            icon="i-lucide-book-check"
            color="success"
            :loading="isCheckingOut"
            :disabled="!checkoutCopyBarcode.trim() || !checkoutDueDate"
            @click="confirmReservedCheckout"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="isStatusConfirmOpen">
    <template #content>
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-xl"
            :class="pendingStatusAction?.nextStatus === 'Cancelled'
              ? 'bg-error/10 text-error'
              : 'bg-success/10 text-success'"
          >
            <UIcon
              :name="pendingStatusAction?.nextStatus === 'Cancelled'
                ? 'i-lucide-circle-x'
                : 'i-lucide-circle-check'"
              class="size-5"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ statusConfirmationTitle }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-muted">
              {{ statusConfirmationDescription }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            label="Go Back"
            color="neutral"
            variant="ghost"
            :disabled="Boolean(updatingReservationId)"
            @click="isStatusConfirmOpen = false"
          />
          <UButton
            :label="pendingStatusAction?.nextStatus === 'Cancelled'
              ? 'Confirm Cancellation'
              : 'Confirm Update'"
            :icon="pendingStatusAction?.nextStatus === 'Cancelled'
              ? 'i-lucide-x'
              : 'i-lucide-check'"
            :color="pendingStatusAction?.nextStatus === 'Cancelled'
              ? 'error'
              : 'success'"
            :loading="Boolean(updatingReservationId)"
            @click="confirmStatusUpdate"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isCreateOpen"
    :dismissible="!isSaving"
    :ui="{
      content:
        'sm:max-w-4xl max-h-[90dvh] overflow-y-auto',
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
              Verify the member, select one or
              more book titles, and set the pickup
              expiration.
            </p>
          </div>

          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            square
            aria-label="Close reservation form"
            :disabled="isSaving"
            @click="() => { isCreateOpen = false }"
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
              class="mt-4 space-y-3"
              @submit.prevent="
                lookupReservationMember
              "
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-stretch"
              >
                <UInput
                  v-model="memberBarcode"
                  icon="i-lucide-id-card"
                  placeholder="Member barcode"
                  autocomplete="off"
                  :loading="isLookingUpMember"
                  class="min-w-0 flex-1"
                >
                  <template #trailing>
                    <UKbd>Enter</UKbd>
                  </template>
                </UInput>

                <LiveBarcodeScanner
                  :disabled="
                    isLookingUpMember ||
                    isLookingUpBookBarcode ||
                    isSaving
                  "
                  title="Scan Member Barcode"
                  button-label="Scan Member"
                  ready-description="Place the Student Library Card or Faculty ID barcode inside the guide."
                  processing-label="Verifying member"
                  processing-description="Please wait while the member record and reservation eligibility are checked."
                  storage-key="sncbt-reservation-member-camera"
                  :duplicate-cooldown-ms="5000"
                  :detection-hold-ms="800"
                  @detected="
                    handleMemberCameraDetected
                  "
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
                    !memberBarcode.trim() ||
                    isSaving
                  "
                  class="shrink-0"
                />
              </div>

              <p class="text-xs text-muted">
                Use a physical scanner, the camera,
                or enter the member barcode manually.
              </p>
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
                  Book Titles
                </h3>
                <p
                  class="text-xs text-muted"
                >
                  Select one or more titles. A
                  scanned physical-copy barcode is
                  matched to its book title.
                </p>
              </div>
            </div>

            <form
              class="mt-4 space-y-3"
              @submit.prevent="
                searchBooksForReservation
              "
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-stretch"
              >
                <UInput
                  v-model="bookSearch"
                  icon="i-lucide-search"
                  placeholder="Title, author, ISBN, or physical book barcode"
                  :loading="
                    isSearchingBooks ||
                    isLookingUpBookBarcode
                  "
                  class="min-w-0 flex-1"
                >
                  <template #trailing>
                    <UKbd>Enter</UKbd>
                  </template>
                </UInput>

                <LiveBarcodeScanner
                  :disabled="
                    !reservationMember ||
                    isLookingUpMember ||
                    isLookingUpBookBarcode ||
                    isSearchingBooks ||
                    isSaving
                  "
                  title="Scan Physical Book Barcode"
                  button-label="Scan Book"
                  ready-description="Place the physical book control-number or accession-number barcode inside the guide."
                  processing-label="Finding book title"
                  processing-description="Please wait while the physical copy is matched with its book title."
                  storage-key="sncbt-reservation-book-camera"
                  :duplicate-cooldown-ms="5000"
                  :detection-hold-ms="800"
                  @detected="
                    handleBookCameraDetected
                  "
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
                    bookSearch.trim().length < 2 ||
                    isLookingUpBookBarcode
                  "
                  class="shrink-0"
                />
              </div>

              <p class="text-xs text-muted">
                Search by title, author, or ISBN, or
                scan any physical copy to select its
                title.
              </p>
            </form>

            <div
              v-if="selectedBooks.length"
              class="mt-4 rounded-xl border border-success/30 bg-success/5 p-4"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p
                    class="font-semibold text-highlighted"
                  >
                    Selected Books
                  </p>
                  <p
                    class="text-xs text-muted"
                  >
                    {{
                      selectedBookCount
                    }}
                    {{
                      selectedBookCount === 1
                        ? "title"
                        : "titles"
                    }}
                    will receive separate reservation
                    records.
                  </p>
                </div>

                <UBadge
                  color="success"
                  variant="soft"
                >
                  {{ selectedBookCount }} selected
                </UBadge>
              </div>

              <div class="mt-3 space-y-2">
                <div
                  v-for="book in selectedBooks"
                  :key="`selected-${book.documentId}`"
                  class="flex items-start gap-3 rounded-lg bg-default p-3"
                >
                  <UIcon
                    name="i-lucide-book-check"
                    class="mt-0.5 size-4 shrink-0 text-success"
                  />

                  <div class="min-w-0 flex-1">
                    <p
                      class="truncate text-sm font-semibold text-highlighted"
                    >
                      {{ book.title }}
                    </p>
                    <p
                      class="truncate text-xs text-muted"
                    >
                      {{ book.author }}
                    </p>
                  </div>

                  <UButton
                    type="button"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    :aria-label="`Remove ${book.title}`"
                    :disabled="isSaving"
                    @click="
                      removeReservationBook(
                        book.documentId,
                      )
                    "
                  />
                </div>
              </div>
            </div>

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
                  isBookSelected(book)
                    ? 'border-success bg-success/5 ring-2 ring-success/20'
                    : 'border-default hover:bg-elevated'
                "
                :aria-pressed="
                  isBookSelected(book)
                "
                @click="
                  toggleReservationBook(
                    book,
                  )
                "
              >
                <div
                  class="flex items-start justify-between gap-3"
                >
                  <p
                    class="line-clamp-2 font-semibold text-highlighted"
                  >
                    {{ book.title }}
                  </p>

                  <UBadge
                    v-if="isBookSelected(book)"
                    color="success"
                    variant="soft"
                    size="sm"
                  >
                    Selected
                  </UBadge>
                </div>
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
                  Apply the same expiration and
                  remarks to all selected titles.
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
            @click="() => { isCreateOpen = false }"
          />

          <UButton
            :label="createButtonLabel"
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
