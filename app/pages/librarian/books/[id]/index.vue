<script setup lang="ts">
import BarcodeCard from "~/components/librarian/BarcodeCard.vue";
import { useAuth } from "~/composables/useAuth";
import { useBarcodePrintQueue } from "~/composables/useBarcodePrintQueue";

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

interface BookCopy {
  id?: number;
  documentId?: string;
  accession_number?: string | null;
  control_number: string;
  inventory_date?: number | null;
  price?: number | null;
  shelf_location?: string | null;
  copy_status: CopyStatus;
  condition?: string | null;
  remarks?: string | null;
  selected: boolean;
}

interface BookRecord {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
  isbn?: string | null;
  classification_number?: string | null;
  author_number?: string | null;
  call_number?: string | null;
  subject?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyright_year?: number | null;
  description?: string | null;
  record_status?: "Active" | "Archived";
  createdAt?: string;
  updatedAt?: string;
  book_copies?:
    | Omit<BookCopy, "selected">[]
    | { data?: Omit<BookCopy, "selected">[] };
}

interface BookResponse {
  data: BookRecord;
}

const route = useRoute();
const auth = useAuth();
const toast = useToast();
const printQueue = useBarcodePrintQueue();

const isLoading = ref(true);
const loadError = ref("");
const book = ref<BookRecord | null>(null);
const copies = ref<BookCopy[]>([]);
const copySearch = ref("");
const statusFilter = ref("All Statuses");

const bookIdentifier = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? value[0] ?? "" : String(value ?? "");
});

const statusItems = [
  "All Statuses",
  "Available",
  "Borrowed",
  "Reserved",
  "Damaged",
  "Lost",
  "Archived",
];

const selectedCopies = computed(() =>
  copies.value.filter((copy) => copy.selected),
);

const filteredCopies = computed(() => {
  const keyword = copySearch.value.trim().toLocaleLowerCase("en");

  return copies.value.filter((copy) => {
    const matchesStatus =
      statusFilter.value === "All Statuses" ||
      copy.copy_status === statusFilter.value;

    if (!matchesStatus) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      copy.accession_number,
      copy.accession_number || copy.control_number,
      copy.shelf_location,
      copy.copy_status,
      copy.condition,
    ].some((value) =>
      String(value ?? "")
        .toLocaleLowerCase("en")
        .includes(keyword),
    );
  });
});

const totalCopies = computed(() => copies.value.length);
const availableCopies = computed(
  () =>
    copies.value.filter((copy) => copy.copy_status === "Available")
      .length,
);
const borrowedCopies = computed(
  () =>
    copies.value.filter((copy) => copy.copy_status === "Borrowed")
      .length,
);
const attentionCopies = computed(
  () =>
    copies.value.filter(
      (copy) =>
        copy.copy_status === "Damaged" || copy.copy_status === "Lost",
    ).length,
);

const allFilteredSelected = computed(
  () =>
    filteredCopies.value.length > 0 &&
    filteredCopies.value.every((copy) => copy.selected),
);

const editRoute = computed(() =>
  bookIdentifier.value
    ? `/librarian/books/${bookIdentifier.value}/edit`
    : "/librarian/books",
);

const bookCoverThemes = [
  "bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 text-emerald-700 ring-emerald-200/70 dark:from-emerald-950/85 dark:via-teal-950/60 dark:to-sky-950/45 dark:text-emerald-300 dark:ring-emerald-800/60",
  "bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 text-indigo-700 ring-indigo-200/70 dark:from-indigo-950/85 dark:via-violet-950/60 dark:to-fuchsia-950/45 dark:text-indigo-300 dark:ring-indigo-800/60",
  "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 text-amber-800 ring-amber-200/70 dark:from-amber-950/80 dark:via-orange-950/55 dark:to-rose-950/45 dark:text-amber-300 dark:ring-amber-800/60",
  "bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-100 text-sky-700 ring-sky-200/70 dark:from-sky-950/85 dark:via-cyan-950/60 dark:to-emerald-950/45 dark:text-sky-300 dark:ring-sky-800/60",
] as const;

const bookCoverTheme = computed(() => {
  if (!book.value) {
    return bookCoverThemes[0];
  }

  const seed = `${book.value.title}|${book.value.author}|${book.value.call_number ?? ""}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return bookCoverThemes[hash % bookCoverThemes.length] ?? bookCoverThemes[0];
});

const bookCoverLabel = computed(() =>
  book.value?.classification_number?.trim() ||
  book.value?.call_number?.trim() ||
  "Library Book",
);

const recordActionItems = computed(() => [
  [
    {
      label: "Edit book",
      icon: "i-lucide-pencil",
      onSelect() {
        void navigateTo(editRoute.value);
      },
    },
    {
      label: "Print all labels",
      icon: "i-lucide-printer",
      disabled: copies.value.length === 0,
      onSelect() {
        queueLabels(copies.value);
      },
    },
  ],
]);

function getHttpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
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
  const records = Array.isArray(relation)
    ? relation
    : relation && Array.isArray(relation.data)
      ? relation.data
      : [];

  return records.map((copy) => ({
    ...copy,
    selected: false,
  }));
}

function statusColor(
  status: CopyStatus,
): "success" | "warning" | "info" | "error" | "neutral" {
  const colors: Record<
    CopyStatus,
    "success" | "warning" | "info" | "error" | "neutral"
  > = {
    Available: "success",
    Borrowed: "info",
    Reserved: "info",
    Damaged: "error",
    Lost: "error",
    Archived: "neutral",
  };

  return colors[status];
}

function formatPrice(value?: number | null): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value ?? 0));
}

function formatDate(value?: string): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function loadBook(): Promise<void> {
  if (!bookIdentifier.value) {
    loadError.value = "The book identifier is missing.";
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  loadError.value = "";

  try {
    const response = await auth.authFetch<BookResponse>(
      `/api/books/${bookIdentifier.value}`,
      {
        method: "GET",
        query: {
          "populate[book_copies][fields][0]": "accession_number",
          "populate[book_copies][fields][1]": "control_number",
          "populate[book_copies][fields][2]": "inventory_date",
          "populate[book_copies][fields][3]": "price",
          "populate[book_copies][fields][4]": "shelf_location",
          "populate[book_copies][fields][5]": "copy_status",
          "populate[book_copies][fields][6]": "condition",
          "populate[book_copies][fields][7]": "remarks",
          "populate[book_copies][sort][0]": "accession_number:asc",
        },
      },
    );

    book.value = response.data;
    copies.value = normalizeCopies(response.data.book_copies);

    if (route.query.registered === "1") {
      toast.add({
        title: "Book registered successfully",
        description:
          "The physical copies and barcode labels are ready below.",
        color: "success",
        icon: "i-lucide-circle-check-big",
      });
    }

    if (route.query.updated === "1") {
      toast.add({
        title: "Book information updated",
        description:
          "The classification, call number, subject, and copy shelf locations were updated.",
        color: "success",
        icon: "i-lucide-save",
      });
    }
  } catch (error) {
    if (getHttpStatus(error) === 401) {
      auth.clearSession();

      await navigateTo({
        path: "/",
        query: {
          redirect: route.fullPath,
        },
      });

      return;
    }

    loadError.value = auth.getErrorMessage(error);
  } finally {
    isLoading.value = false;
  }
}

function toggleFilteredSelection(value: boolean): void {
  for (const copy of filteredCopies.value) {
    copy.selected = value;
  }
}

function queueLabels(targetCopies: BookCopy[]): void {
  if (!book.value || targetCopies.length === 0) {
    toast.add({
      title: "No labels selected",
      description: "Select at least one physical copy before printing.",
      color: "warning",
      icon: "i-lucide-printer",
    });
    return;
  }

  printQueue.setPrintQueue(
    targetCopies.map((copy) => ({
      controlNumber: copy.accession_number || copy.control_number,
      title: book.value!.title,
      author: book.value!.author,
      shelfLocation: copy.shelf_location ?? "",
    })),
    route.fullPath,
  );

  void navigateTo("/librarian/books/print");
}

onMounted(() => {
  void loadBook();
});
</script>

<template>
  <UContainer class="sncbt-page-shell">
    <div class="space-y-6">
      <section
        class="relative overflow-hidden rounded-3xl border border-default bg-gradient-to-br from-primary/10 via-default to-sky-500/5 p-5 shadow-sm sm:p-6"
      >
        <div
          class="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        ></div>

        <div
          class="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div class="flex min-w-0 items-start gap-3">
            <UButton
              to="/librarian/books"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="soft"
              square
              class="mt-0.5 shrink-0"
              aria-label="Back to Library Collection"
            />

            <div class="min-w-0">
              <div
                class="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"
              >
                <span>Books & Collection</span>
                <span aria-hidden="true">•</span>
                <span class="text-muted">Book record</span>
              </div>

              <div class="flex flex-wrap items-center gap-2.5">
                <h1
                  class="min-w-0 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
                >
                  {{ book?.title || "Book Record" }}
                </h1>

                <UBadge
                  v-if="book"
                  :color="book.record_status === 'Archived' ? 'neutral' : 'success'"
                  variant="soft"
                >
                  {{ book.record_status || "Active" }}
                </UBadge>
              </div>

              <p class="mt-2 text-sm text-muted sm:text-base">
                {{ book?.author || "View book information, physical copies, and barcode labels." }}
              </p>

              <div
                v-if="book"
                class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted"
              >
                <span class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-library-big" class="size-4 text-primary" />
                  {{ totalCopies }} physical {{ totalCopies === 1 ? "copy" : "copies" }}
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-circle-check" class="size-4 text-success" />
                  {{ availableCopies }} available now
                </span>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <UButton
              to="/librarian/books/register"
              label="Register Another"
              icon="i-lucide-plus"
              color="primary"
            />

            <UDropdownMenu
              :items="recordActionItems"
              :content="{ align: 'end' }"
              :ui="{ content: 'w-52' }"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="outline"
                square
                :disabled="!book"
                aria-label="More book actions"
              />
            </UDropdownMenu>
          </div>
        </div>
      </section>

      <UAlert
        v-if="loadError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Unable to load this book"
        :description="loadError"
        :actions="[
          {
            label: 'Try again',
            color: 'error',
            variant: 'outline',
            onClick: loadBook,
          },
        ]"
      />

      <div v-if="isLoading" class="grid gap-4 lg:grid-cols-3">
        <UCard v-for="item in 4" :key="item">
          <div class="space-y-3">
            <USkeleton class="h-6 w-2/3" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-24 w-full" />
          </div>
        </UCard>
      </div>

      <template v-else-if="book">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UIcon name="i-lucide-book-copy" class="size-5" />
              </div>
              <div>
                <p class="text-2xl font-bold text-highlighted">
                  {{ totalCopies }}
                </p>
                <p class="text-xs text-muted">Physical copies</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success"
              >
                <UIcon name="i-lucide-circle-check" class="size-5" />
              </div>
              <div>
                <p class="text-2xl font-bold text-success">
                  {{ availableCopies }}
                </p>
                <p class="text-xs text-muted">Available</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-11 items-center justify-center rounded-xl bg-info/10 text-info"
              >
                <UIcon name="i-lucide-book-up" class="size-5" />
              </div>
              <div>
                <p class="text-2xl font-bold text-warning">
                  {{ borrowedCopies }}
                </p>
                <p class="text-xs text-muted">Borrowed</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div
                class="flex size-11 items-center justify-center rounded-xl bg-error/10 text-error"
              >
                <UIcon name="i-lucide-triangle-alert" class="size-5" />
              </div>
              <div>
                <p class="text-2xl font-bold text-error">
                  {{ attentionCopies }}
                </p>
                <p class="text-xs text-muted">Need attention</p>
              </div>
            </div>
          </UCard>
        </div>

        <div class="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <UCard class="self-start xl:sticky xl:top-6">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="font-semibold text-highlighted">
                    Book Information
                  </h2>
                  <p class="text-sm text-muted">Catalog metadata</p>
                </div>

                <UButton
                  :to="editRoute"
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  square
                  aria-label="Edit book information"
                />
              </div>
            </template>

            <div class="space-y-5">
              <div
                class="relative mx-auto aspect-[4/5] w-full max-w-60 overflow-hidden rounded-3xl ring-1 ring-inset shadow-sm"
                :class="bookCoverTheme"
              >
                <span
                  class="pointer-events-none absolute -right-10 -top-8 size-36 rounded-full bg-white/35 blur-sm dark:bg-white/5"
                  aria-hidden="true"
                />
                <span
                  class="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-white/30 blur-sm dark:bg-white/5"
                  aria-hidden="true"
                />
                <span
                  class="pointer-events-none absolute inset-y-0 left-0 w-2 bg-current opacity-35"
                  aria-hidden="true"
                />

                <div class="relative flex h-full flex-col justify-between p-5">
                  <div
                    class="flex size-14 items-center justify-center rounded-2xl bg-white/75 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-950/35 dark:ring-white/10"
                  >
                    <UIcon name="i-lucide-book-open" class="size-8" />
                  </div>

                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-[0.18em] opacity-65">
                      SNCBT Library
                    </p>
                    <p class="mt-2 line-clamp-3 text-lg font-bold leading-snug">
                      {{ book.title }}
                    </p>
                    <p class="mt-2 line-clamp-2 text-xs font-medium opacity-75">
                      {{ bookCoverLabel }}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 class="text-xl font-bold text-highlighted">
                  {{ book.title }}
                </h2>
                <p class="mt-1 text-sm text-muted">{{ book.author }}</p>

                <div class="mt-3 flex flex-wrap gap-2">
                  <UBadge color="neutral" variant="soft">
                    {{ book.subject || "Subject not provided" }}
                  </UBadge>
                  <UBadge color="primary" variant="soft">
                    {{ book.call_number || "No call number" }}
                  </UBadge>
                </div>
              </div>

              <section class="rounded-2xl border border-default bg-elevated/45 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Classification
                </p>
                <dl class="mt-3 grid gap-3 text-sm">
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <dt class="text-muted">Classification number</dt>
                    <dd class="font-mono font-semibold text-highlighted">
                      {{ book.classification_number || "Not provided" }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <dt class="text-muted">Author number</dt>
                    <dd class="font-mono font-semibold text-highlighted">
                      {{ book.author_number || "Not provided" }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <dt class="text-muted">Call number</dt>
                    <dd class="max-w-44 break-words text-right font-mono font-semibold text-highlighted">
                      {{ book.call_number || "Not provided" }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section class="rounded-2xl border border-default bg-elevated/45 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Publication
                </p>
                <dl class="mt-3 grid gap-3 text-sm">
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <dt class="text-muted">ISBN</dt>
                    <dd class="max-w-44 break-words text-right font-semibold text-highlighted">
                      {{ book.isbn || "Not provided" }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <dt class="text-muted">Publisher</dt>
                    <dd class="max-w-44 text-right font-semibold text-highlighted">
                      {{ book.publisher || "Not provided" }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <dt class="text-muted">Edition</dt>
                    <dd class="font-semibold text-highlighted">
                      {{ book.edition || "Not provided" }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <dt class="text-muted">Copyright</dt>
                    <dd class="font-semibold text-highlighted">
                      {{ book.copyright_year || "Not provided" }}
                    </dd>
                  </div>
                </dl>
              </section>

              <p
                v-if="book.description"
                class="rounded-2xl border border-default bg-default p-4 text-sm leading-6 text-muted"
              >
                {{ book.description }}
              </p>

              <p class="flex items-center gap-2 text-xs text-muted">
                <UIcon name="i-lucide-clock-3" class="size-4" />
                Updated {{ formatDate(book.updatedAt) }}
              </p>
            </div>
          </UCard>

          <div class="space-y-4">
            <UCard>
              <div
                class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
              >
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-lg font-semibold text-highlighted">
                      Physical Copies & Barcodes
                    </h2>
                    <UBadge color="neutral" variant="soft">
                      {{ filteredCopies.length }} shown
                    </UBadge>
                  </div>
                  <p class="mt-1 text-sm text-muted">
                    Find a copy, check its availability, and print or download barcode labels.
                  </p>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row">
                  <UInput
                    v-model="copySearch"
                    icon="i-lucide-search"
                    placeholder="Search accession or barcode"
                    class="w-full sm:w-64"
                  />

                  <USelect
                    v-model="statusFilter"
                    :items="statusItems"
                    class="w-full sm:w-44"
                  />
                </div>
              </div>

              <div
                v-if="filteredCopies.length > 0"
                class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <UCheckbox
                  :model-value="allFilteredSelected"
                  label="Select copies shown"
                  @update:model-value="toggleFilteredSelection(Boolean($event))"
                />

                <div class="flex flex-wrap gap-2">
                  <UBadge color="neutral" variant="soft">
                    {{ selectedCopies.length }} selected
                  </UBadge>

                  <UButton
                    label="Print Selected"
                    icon="i-lucide-printer"
                    color="primary"
                    size="sm"
                    :disabled="selectedCopies.length === 0"
                    @click="queueLabels(selectedCopies)"
                  />
                </div>
              </div>
            </UCard>

            <div
              v-if="filteredCopies.length > 0"
              class="grid gap-4 2xl:grid-cols-2"
            >
              <article
                v-for="copy in filteredCopies"
                :key="copy.documentId ?? copy.control_number"
                class="rounded-2xl border border-default bg-default p-3 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md motion-reduce:transform-none"
              >
                <div class="mb-3 flex items-center justify-between gap-3 px-1">
                  <UCheckbox
                    v-model="copy.selected"
                    :label="`Select accession ${copy.accession_number || 'not assigned'}`"
                  />

                  <UBadge
                    :color="statusColor(copy.copy_status)"
                    variant="soft"
                  >
                    {{ copy.copy_status }}
                  </UBadge>
                </div>

                <BarcodeCard
                  :control-number="copy.accession_number || copy.control_number"
                  :title="book.title"
                  :author="book.author"
                  :shelf-location="copy.shelf_location || ''"
                  :status="copy.copy_status"
                  :condition="copy.condition || 'Good'"
                />

                <dl
                  class="mt-3 grid gap-2 rounded-xl bg-elevated/45 p-3 text-xs sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-2"
                >
                  <div>
                    <dt class="text-muted">Shelf</dt>
                    <dd class="mt-1 font-semibold text-highlighted">
                      {{ copy.shelf_location || "Not assigned" }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">Condition</dt>
                    <dd class="mt-1 font-semibold text-highlighted">
                      {{ copy.condition || "Good" }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">Inventory year</dt>
                    <dd class="mt-1 font-semibold text-highlighted">
                      {{ copy.inventory_date || "Not provided" }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">Price</dt>
                    <dd class="mt-1 font-semibold text-highlighted">
                      {{ formatPrice(copy.price) }}
                    </dd>
                  </div>
                </dl>

                <p
                  v-if="copy.remarks"
                  class="mt-3 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-toned"
                >
                  <UIcon name="i-lucide-notebook-pen" class="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>{{ copy.remarks }}</span>
                </p>
              </article>
            </div>

            <UCard v-else>
              <div class="flex flex-col items-center px-4 py-12 text-center">
                <UIcon name="i-lucide-scan-barcode" class="size-12 text-muted" />
                <h3 class="mt-4 font-semibold text-highlighted">
                  No matching physical copies
                </h3>
                <p class="mt-1 max-w-md text-sm text-muted">
                  Change the copy search or status filter to view barcode labels.
                </p>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </div>
  </UContainer>
</template>
