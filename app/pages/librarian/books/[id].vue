<script setup lang="ts">
import BarcodeCard from "~/components/librarian/BarcodeCard.vue";

definePageMeta({
  layout: "librarian",
  title: "Book Record",
});

type CopyStatus =
  | "Available"
  | "Borrowed"
  | "Reserved"
  | "Damaged"
  | "Lost"
  | "Archived";

type StatusColor =
  | "success"
  | "warning"
  | "info"
  | "error"
  | "neutral";

interface BookCopy {
  id?: number;
  documentId?: string;
  control_number: string;
  shelf_location?: string | null;
  copy_status: CopyStatus;
  condition?: string | null;
  remarks?: string | null;
  createdAt?: string;
}

interface SelectableBookCopy
  extends BookCopy {
  selected: boolean;
}

interface BookRecord {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
  isbn?: string | null;
  category?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyright_year?: number | null;
  description?: string | null;
  record_status?: "Active" | "Archived";
  createdAt?: string;
  updatedAt?: string;
  book_copies?: BookCopy[] | {
    data?: BookCopy[];
  };
}

interface BookResponse {
  data: BookRecord;
}

const route = useRoute();
const auth = useAuth();
const toast = useToast();
const printQueue = useBarcodePrintQueue();

const book = ref<BookRecord | null>(null);
const copies = ref<SelectableBookCopy[]>([]);
const isLoading = ref(true);
const loadError = ref("");

const copySearch = ref("");
const statusFilter = ref("All Statuses");

const statusItems = [
  "All Statuses",
  "Available",
  "Borrowed",
  "Reserved",
  "Damaged",
  "Lost",
  "Archived",
];

const wasJustRegistered = computed(
  () => route.query.registered === "1",
);

const visibleCopies = computed(() => {
  const keyword = copySearch.value
    .trim()
    .toLowerCase();

  return copies.value.filter((copy) => {
    const matchesStatus =
      statusFilter.value ===
        "All Statuses" ||
      copy.copy_status ===
        statusFilter.value;

    const matchesSearch =
      !keyword ||
      copy.control_number
        .toLowerCase()
        .includes(keyword) ||
      (copy.shelf_location ?? "")
        .toLowerCase()
        .includes(keyword);

    return matchesStatus && matchesSearch;
  });
});

const selectedCopies = computed(() =>
  copies.value.filter(
    (copy) => copy.selected,
  ),
);

const allVisibleSelected = computed({
  get: () =>
    visibleCopies.value.length > 0 &&
    visibleCopies.value.every(
      (copy) => copy.selected,
    ),
  set: (value: boolean) => {
    visibleCopies.value.forEach(
      (copy) => {
        copy.selected = value;
      },
    );
  },
});

const totalCopies = computed(
  () => copies.value.length,
);

const availableCopies = computed(
  () =>
    copies.value.filter(
      (copy) =>
        copy.copy_status === "Available",
    ).length,
);

const borrowedCopies = computed(
  () =>
    copies.value.filter(
      (copy) =>
        copy.copy_status === "Borrowed",
    ).length,
);

const attentionCopies = computed(
  () =>
    copies.value.filter(
      (copy) =>
        copy.copy_status === "Damaged" ||
        copy.copy_status === "Lost",
    ).length,
);

function getHttpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    status?: number;
    statusCode?: number;
    response?: {
      status?: number;
    };
  };

  return (
    fetchError.response?.status ??
    fetchError.statusCode ??
    fetchError.status
  );
}

function normalizeCopies(
  relation: BookRecord["book_copies"],
): BookCopy[] {
  if (Array.isArray(relation)) {
    return relation;
  }

  if (
    relation &&
    Array.isArray(relation.data)
  ) {
    return relation.data;
  }

  return [];
}

function getStatusColor(
  status: CopyStatus,
): StatusColor {
  const colors: Record<
    CopyStatus,
    StatusColor
  > = {
    Available: "success",
    Borrowed: "warning",
    Reserved: "info",
    Damaged: "error",
    Lost: "error",
    Archived: "neutral",
  };

  return colors[status];
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

async function loadBook() {
  isLoading.value = true;
  loadError.value = "";

  try {
    const identifier = String(
      route.params.id,
    );

    const response =
      await auth.authFetch<BookResponse>(
        `/api/books/${identifier}`,
        {
          method: "GET",
          query: {
            "populate[book_copies][fields][0]":
              "control_number",
            "populate[book_copies][fields][1]":
              "shelf_location",
            "populate[book_copies][fields][2]":
              "copy_status",
            "populate[book_copies][fields][3]":
              "condition",
            "populate[book_copies][fields][4]":
              "remarks",
            "populate[book_copies][fields][5]":
              "createdAt",
            "populate[book_copies][sort][0]":
              "control_number:asc",
          },
        },
      );

    book.value = response.data;

    copies.value = normalizeCopies(
      response.data.book_copies,
    ).map((copy) => ({
      ...copy,
      selected: false,
    }));
  } catch (error) {
    const status = getHttpStatus(error);

    if (status === 401) {
      auth.clearSession();

      await navigateTo({
        path: "/",
        query: {
          redirect: route.fullPath,
        },
      });

      return;
    }

    if (status === 404) {
      loadError.value =
        "The requested book record could not be found.";
    } else {
      loadError.value =
        auth.getErrorMessage(error);
    }
  } finally {
    isLoading.value = false;
  }
}

function createPrintItems(
  sourceCopies: BookCopy[],
) {
  if (!book.value) {
    return [];
  }

  return sourceCopies.map((copy) => ({
    controlNumber:
      copy.control_number,
    title: book.value!.title,
    author: book.value!.author,
    shelfLocation:
      copy.shelf_location ?? "",
  }));
}

async function printCopies(
  sourceCopies: BookCopy[],
) {
  if (sourceCopies.length === 0) {
    toast.add({
      title: "No labels selected",
      description:
        "Select at least one physical copy before printing.",
      color: "warning",
      icon: "i-lucide-printer",
    });

    return;
  }

  printQueue.setPrintQueue(
    createPrintItems(sourceCopies),
    route.fullPath,
  );

  await navigateTo(
    "/librarian/books/print",
  );
}

function clearCopyFilters() {
  copySearch.value = "";
  statusFilter.value = "All Statuses";
}

onMounted(() => {
  void loadBook();
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="space-y-6">
      <div
        class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
      >
        <div class="flex items-start gap-3">
          <UButton
            to="/librarian/books"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            aria-label="Back to library collection"
          />

          <div>
            <p
              class="text-sm font-medium text-primary"
            >
              Library Collection
            </p>

            <h1
              class="mt-1 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              {{
                book?.title ||
                "Book Record"
              }}
            </h1>

            <p
              v-if="book"
              class="mt-1 text-sm text-muted"
            >
              {{ book.author }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            to="/librarian/books/register"
            label="Register Another"
            icon="i-lucide-plus"
            color="success"
            variant="soft"
          />

          <UButton
            label="Print All Labels"
            icon="i-lucide-printer"
            color="primary"
            :disabled="
              copies.length === 0 ||
              isLoading
            "
            @click="printCopies(copies)"
          />
        </div>
      </div>

      <UAlert
        v-if="wasJustRegistered && book"
        color="success"
        variant="soft"
        icon="i-lucide-circle-check-big"
        title="Book registration completed"
        :description="`${copies.length} ${
          copies.length === 1
            ? 'physical copy is'
            : 'physical copies are'
        } ready. The generated barcodes are displayed below and can be downloaded or printed immediately.`"
      />

      <UAlert
        v-if="loadError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Unable to open the book record"
        :description="loadError"
        :actions="[
          {
            label: 'Try again',
            color: 'error',
            variant: 'outline',
            onClick: loadBook,
          },
          {
            label: 'Back to Catalog',
            color: 'neutral',
            variant: 'ghost',
            to: '/librarian/books',
          },
        ]"
      />

      <div
        v-if="isLoading"
        class="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]"
      >
        <UCard>
          <div class="space-y-4">
            <USkeleton
              class="mx-auto h-48 w-36 rounded-xl"
            />
            <USkeleton class="h-6 w-full" />
            <USkeleton class="h-4 w-2/3" />
            <USkeleton class="h-28 w-full" />
          </div>
        </UCard>

        <div class="space-y-4">
          <div
            class="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <USkeleton
              v-for="item in 4"
              :key="item"
              class="h-24 rounded-xl"
            />
          </div>

          <USkeleton
            class="h-96 rounded-xl"
          />
        </div>
      </div>

      <template v-else-if="book">
        <div
          class="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UIcon
                  name="i-lucide-book-copy"
                  class="size-5"
                />
              </div>

              <div>
                <p
                  class="text-2xl font-bold text-highlighted"
                >
                  {{ totalCopies }}
                </p>
                <p class="text-xs text-muted">
                  Total copies
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success"
              >
                <UIcon
                  name="i-lucide-circle-check"
                  class="size-5"
                />
              </div>

              <div>
                <p
                  class="text-2xl font-bold text-success"
                >
                  {{ availableCopies }}
                </p>
                <p class="text-xs text-muted">
                  Available
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning"
              >
                <UIcon
                  name="i-lucide-book-up"
                  class="size-5"
                />
              </div>

              <div>
                <p
                  class="text-2xl font-bold text-warning"
                >
                  {{ borrowedCopies }}
                </p>
                <p class="text-xs text-muted">
                  Borrowed
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl bg-error/10 text-error"
              >
                <UIcon
                  name="i-lucide-triangle-alert"
                  class="size-5"
                />
              </div>

              <div>
                <p
                  class="text-2xl font-bold text-error"
                >
                  {{ attentionCopies }}
                </p>
                <p class="text-xs text-muted">
                  Need attention
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <div
          class="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]"
        >
          <UCard class="h-fit">
            <div
              class="flex h-48 items-center justify-center rounded-2xl border border-default bg-elevated"
            >
              <UIcon
                name="i-lucide-book-open"
                class="size-16 text-muted"
              />
            </div>

            <div class="mt-5 space-y-4">
              <div>
                <h2
                  class="text-xl font-semibold text-highlighted"
                >
                  {{ book.title }}
                </h2>
                <p class="mt-1 text-sm text-muted">
                  {{ book.author }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UBadge
                  color="primary"
                  variant="soft"
                >
                  {{
                    book.category ||
                    "Uncategorized"
                  }}
                </UBadge>

                <UBadge
                  :color="
                    book.record_status ===
                    'Archived'
                      ? 'neutral'
                      : 'success'
                  "
                  variant="soft"
                >
                  {{
                    book.record_status ??
                    "Active"
                  }}
                </UBadge>
              </div>

              <dl
                class="divide-y divide-default text-sm"
              >
                <div
                  class="flex justify-between gap-4 py-3"
                >
                  <dt class="text-muted">
                    ISBN
                  </dt>
                  <dd
                    class="text-right font-medium text-highlighted"
                  >
                    {{
                      book.isbn ||
                      "Not provided"
                    }}
                  </dd>
                </div>

                <div
                  class="flex justify-between gap-4 py-3"
                >
                  <dt class="text-muted">
                    Publisher
                  </dt>
                  <dd
                    class="text-right font-medium text-highlighted"
                  >
                    {{
                      book.publisher ||
                      "Not provided"
                    }}
                  </dd>
                </div>

                <div
                  class="flex justify-between gap-4 py-3"
                >
                  <dt class="text-muted">
                    Edition
                  </dt>
                  <dd
                    class="text-right font-medium text-highlighted"
                  >
                    {{
                      book.edition ||
                      "Not provided"
                    }}
                  </dd>
                </div>

                <div
                  class="flex justify-between gap-4 py-3"
                >
                  <dt class="text-muted">
                    Publication year
                  </dt>
                  <dd
                    class="text-right font-medium text-highlighted"
                  >
                    {{
                      book.copyright_year ||
                      "Not provided"
                    }}
                  </dd>
                </div>

                <div
                  class="flex justify-between gap-4 py-3"
                >
                  <dt class="text-muted">
                    Registered
                  </dt>
                  <dd
                    class="text-right font-medium text-highlighted"
                  >
                    {{
                      formatDate(
                        book.createdAt,
                      )
                    }}
                  </dd>
                </div>
              </dl>

              <div
                v-if="book.description"
                class="rounded-xl bg-elevated p-4"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Description
                </p>
                <p
                  class="mt-2 whitespace-pre-line text-sm text-toned"
                >
                  {{ book.description }}
                </p>
              </div>
            </div>
          </UCard>

          <div class="space-y-4">
            <UCard>
              <div
                class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
              >
                <div>
                  <h2
                    class="text-lg font-semibold text-highlighted"
                  >
                    Physical Copies & Barcodes
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    Select labels for batch printing or
                    download a barcode directly from its
                    card.
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UCheckbox
                    v-model="allVisibleSelected"
                    :label="`Select shown (${visibleCopies.length})`"
                  />

                  <UButton
                    label="Print Selected"
                    icon="i-lucide-printer"
                    color="primary"
                    variant="soft"
                    :disabled="
                      selectedCopies.length === 0
                    "
                    @click="
                      printCopies(
                        selectedCopies,
                      )
                    "
                  />
                </div>
              </div>

              <div
                class="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto]"
              >
                <UInput
                  v-model="copySearch"
                  icon="i-lucide-search"
                  placeholder="Search control number or shelf"
                  class="w-full"
                />

                <USelect
                  v-model="statusFilter"
                  :items="statusItems"
                  icon="i-lucide-list-filter"
                  class="w-full"
                />

                <UButton
                  label="Clear"
                  color="neutral"
                  variant="ghost"
                  :disabled="
                    !copySearch &&
                    statusFilter ===
                      'All Statuses'
                  "
                  @click="clearCopyFilters"
                />
              </div>
            </UCard>

            <div
              v-if="visibleCopies.length > 0"
              class="grid gap-4 xl:grid-cols-2"
            >
              <div
                v-for="copy in visibleCopies"
                :key="
                  copy.documentId ??
                  copy.id ??
                  copy.control_number
                "
                class="space-y-3"
              >
                <div
                  class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default px-4 py-3"
                >
                  <UCheckbox
                    v-model="copy.selected"
                    label="Select for printing"
                  />

                  <UBadge
                    :color="
                      getStatusColor(
                        copy.copy_status,
                      )
                    "
                    variant="soft"
                  >
                    {{ copy.copy_status }}
                  </UBadge>
                </div>

                <BarcodeCard
                  :control-number="
                    copy.control_number
                  "
                />

                <p
                  v-if="copy.remarks"
                  class="rounded-xl bg-elevated px-4 py-3 text-sm text-muted"
                >
                  <span
                    class="font-medium text-toned"
                  >
                    Remarks:
                  </span>
                  {{ copy.remarks }}
                </p>
              </div>
            </div>

            <UCard v-else>
              <div
                class="flex flex-col items-center px-4 py-12 text-center"
              >
                <div
                  class="flex size-14 items-center justify-center rounded-2xl bg-elevated text-muted"
                >
                  <UIcon
                    name="i-lucide-scan-barcode"
                    class="size-7"
                  />
                </div>

                <h3
                  class="mt-4 font-semibold text-highlighted"
                >
                  {{
                    copies.length === 0
                      ? "No physical copies registered"
                      : "No copies match the filters"
                  }}
                </h3>

                <p
                  class="mt-1 max-w-md text-sm text-muted"
                >
                  {{
                    copies.length === 0
                      ? "This book record does not have any physical copy or barcode yet."
                      : "Clear or change the filters to display the other physical copies."
                  }}
                </p>

                <UButton
                  v-if="copies.length > 0"
                  label="Clear Filters"
                  color="neutral"
                  variant="outline"
                  class="mt-5"
                  @click="clearCopyFilters"
                />
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </div>
  </UContainer>
</template>
