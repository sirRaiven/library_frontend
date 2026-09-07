<script setup lang="ts">
import type { InventoryExportRow } from "~/composables/useLibraryInventoryExcel";
import { useLibraryInventoryExcel } from "~/composables/useLibraryInventoryExcel";
import { useBarcodePrintQueue } from "~/composables/useBarcodePrintQueue";
import { useAuth } from "~/composables/useAuth";
import LiveBarcodeScanner from "~/components/librarian/visits/LiveBarcodeScanner.vue";
import type { BarcodeScanResult } from "~/composables/useBarcodeScanResult";
definePageMeta({
  layout: "librarian",
  title: "Library Collection",
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
  shelf_location?: string | null;
  copy_status: CopyStatus;
  condition?: string | null;
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
  record_status?: "Active" | "Archived";
  createdAt?: string;
  book_copies?: BookCopy[] | {
    data?: BookCopy[];
  };
}

interface BooksResponse {
  data: BookRecord[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

interface ExportInventoryResponse {
  data: InventoryExportRow[];
  meta?: {
    total?: number;
  };
}

interface CatalogBook extends BookRecord {
  copies: BookCopy[];
  totalCopies: number;
  availableCopies: number;
  attentionCopies: number;
}

interface ClassificationRange {
  from: string;
  to: string;
  label: string;
}

const auth = useAuth();
const toast = useToast();
const printQueue = useBarcodePrintQueue();
const inventoryExcel = useLibraryInventoryExcel();
const referenceData = useReferenceData();

const search = ref("");
const selectedShelfLocation = ref("");
const page = ref(1);
const pageSize = 12;

const isLoading = ref(true);
const isExporting = ref(false);
const isBarcodeSearching = ref(false);
const isApplyingBarcodeSearch = ref(false);
const lastScannedBarcode = ref("");
const loadError = ref("");
const books = ref<CatalogBook[]>([]);
const totalBooks = ref(0);
const pageCount = ref(1);

const shelfLocationItems = computed(() => [
  { label: "All Shelf Locations", value: "" },
  ...referenceData.shelfLocations.value.map((item) => ({
    label: item.name,
    value: item.code,
  })),
]);

const selectedShelfLocationName = computed(() =>
  referenceData.shelfLocations.value.find(
    (item) => item.code === selectedShelfLocation.value,
  )?.name ?? "",
);

const copiesOnPage = computed(() =>
  books.value.reduce(
    (total, book) => total + book.totalCopies,
    0,
  ),
);

const availableOnPage = computed(() =>
  books.value.reduce(
    (total, book) =>
      total + book.availableCopies,
    0,
  ),
);

const attentionOnPage = computed(() =>
  books.value.reduce(
    (total, book) =>
      total + book.attentionCopies,
    0,
  ),
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

function normalizeBook(
  book: BookRecord,
): CatalogBook {
  const copies = normalizeCopies(
    book.book_copies,
  );

  const availableCopies = copies.filter(
    (copy) =>
      copy.copy_status === "Available",
  ).length;

  const attentionCopies = copies.filter(
    (copy) =>
      copy.copy_status === "Damaged" ||
      copy.copy_status === "Lost",
  ).length;

  return {
    ...book,
    copies,
    totalCopies: copies.length,
    availableCopies,
    attentionCopies,
  };
}

function normalizeClassificationBoundary(value: string): string | null {
  const normalized = value.trim();

  if (!/^\d{1,3}(?:\.\d{1,10})?$/.test(normalized)) {
    return null;
  }

  const [wholePart = "", decimalPart = ""] = normalized.split(".");
  const wholeNumber = Number.parseInt(wholePart, 10);

  if (!Number.isFinite(wholeNumber) || wholeNumber < 0 || wholeNumber > 999) {
    return null;
  }

  const canonicalDecimal = decimalPart.replace(/0+$/, "");
  const canonicalWhole = String(wholeNumber).padStart(3, "0");

  return canonicalDecimal
    ? `${canonicalWhole}.${canonicalDecimal}`
    : canonicalWhole;
}

function parseClassificationRange(value: string): ClassificationRange | null {
  const match = value.match(
    /^\s*(\d{1,3}(?:\.\d{1,10})?)\s*(?:-|–|—|to)\s*(\d{1,3}(?:\.\d{1,10})?)\s*$/i,
  );

  if (!match) {
    return null;
  }

  const first = normalizeClassificationBoundary(match[1] ?? "");
  const second = normalizeClassificationBoundary(match[2] ?? "");

  if (!first || !second) {
    return null;
  }

  const firstNumber = Number(first);
  const secondNumber = Number(second);
  const from = firstNumber <= secondNumber ? first : second;
  const to = firstNumber <= secondNumber ? second : first;

  return {
    from,
    to,
    label: `${from}–${to}`,
  };
}

const activeClassificationRange = computed(() =>
  parseClassificationRange(search.value),
);

function buildQuery(
  physicalBarcode = "",
): Record<string, unknown> {
  const query: Record<string, unknown> = {
    "sort[0]": "createdAt:desc",
    "pagination[page]": page.value,
    "pagination[pageSize]": pageSize,
    "populate[book_copies][fields][0]":
      "accession_number",
    "populate[book_copies][fields][1]":
      "control_number",
    "populate[book_copies][fields][2]":
      "shelf_location",
    "populate[book_copies][fields][3]":
      "copy_status",
    "populate[book_copies][fields][4]":
      "condition",
  };

  const barcode = physicalBarcode.trim();
  const keyword = search.value.trim();

  if (barcode) {
    query[
      "filters[$or][0][book_copies][control_number][$eqi]"
    ] = barcode;
    query[
      "filters[$or][1][book_copies][accession_number][$eqi]"
    ] = barcode;
  } else if (activeClassificationRange.value) {
    query["filters[classification_number][$gte]"] =
      activeClassificationRange.value.from;
    query["filters[classification_number][$lte]"] =
      activeClassificationRange.value.to;
  } else if (keyword) {
    query[
      "filters[$or][0][title][$containsi]"
    ] = keyword;
    query[
      "filters[$or][1][author][$containsi]"
    ] = keyword;
    query[
      "filters[$or][2][isbn][$containsi]"
    ] = keyword;
    query[
      "filters[$or][3][book_copies][control_number][$containsi]"
    ] = keyword;
    query[
      "filters[$or][4][book_copies][accession_number][$containsi]"
    ] = keyword;
    query["filters[$or][5][call_number][$containsi]"] = keyword;
    query["filters[$or][6][subject][$containsi]"] = keyword;
    query[
      "filters[$or][7][classification_number][$containsi]"
    ] = keyword;
    query[
      "filters[$or][8][book_copies][shelf_location][$containsi]"
    ] = keyword;
    query["filters[$or][9][author_number][$containsi]"] = keyword;
  }

  if (selectedShelfLocationName.value) {
    // Keep legacy string-filter semantics during the observation window.
    query["filters[book_copies][shelf_location][$eq]"] =
      selectedShelfLocationName.value;
  }

  return query;
}

async function loadBooks(
  physicalBarcode: string | Event = "",
) {
  const barcodeFilter =
    typeof physicalBarcode === "string"
      ? physicalBarcode
      : "";

  isLoading.value = true;
  loadError.value = "";

  try {
    const response =
      await auth.authFetch<BooksResponse>(
        "/api/books",
        {
          method: "GET",
          query: buildQuery(barcodeFilter),
        },
      );

    books.value = response.data.map(
      normalizeBook,
    );

    const pagination =
      response.meta?.pagination;

    totalBooks.value =
      pagination?.total ??
      response.data.length;

    pageCount.value =
      pagination?.pageCount ?? 1;
  } catch (error) {
    if (getHttpStatus(error) === 401) {
      auth.clearSession();

      await navigateTo({
        path: "/",
        query: {
          redirect: "/librarian/books",
        },
      });

      return;
    }

    loadError.value =
      auth.getErrorMessage(error);

    toast.add({
      title: "Unable to load books",
      description: loadError.value,
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isLoading.value = false;
  }
}

function bookRoute(book: CatalogBook) {
  const identifier =
    book.documentId ?? book.id;

  return identifier
    ? `/librarian/books/${identifier}`
    : "/librarian/books";
}

function editBookRoute(book: CatalogBook) {
  const identifier =
    book.documentId ?? book.id;

  return identifier
    ? `/librarian/books/${identifier}/edit`
    : "/librarian/books";
}

const bookCoverThemes = [
  "bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 text-emerald-700 ring-emerald-200/70 dark:from-emerald-950/85 dark:via-teal-950/60 dark:to-sky-950/45 dark:text-emerald-300 dark:ring-emerald-800/60",
  "bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 text-indigo-700 ring-indigo-200/70 dark:from-indigo-950/85 dark:via-violet-950/60 dark:to-fuchsia-950/45 dark:text-indigo-300 dark:ring-indigo-800/60",
  "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 text-amber-800 ring-amber-200/70 dark:from-amber-950/80 dark:via-orange-950/55 dark:to-rose-950/45 dark:text-amber-300 dark:ring-amber-800/60",
  "bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-100 text-sky-700 ring-sky-200/70 dark:from-sky-950/85 dark:via-cyan-950/60 dark:to-emerald-950/45 dark:text-sky-300 dark:ring-sky-800/60",
] as const;

function bookCoverTheme(book: CatalogBook): string {
  const seed = `${book.title}|${book.author}|${book.call_number ?? ""}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return bookCoverThemes[hash % bookCoverThemes.length] ?? bookCoverThemes[0];
}

function bookCoverLabel(book: CatalogBook): string {
  return (
    book.classification_number?.trim() ||
    book.call_number?.trim() ||
    "Library Book"
  );
}

function bookCoverSecondaryLabel(book: CatalogBook): string {
  return (
    book.author_number?.trim() ||
    book.call_number?.trim() ||
    "SNCBT Collection"
  );
}

function bookActionItems(book: CatalogBook) {
  return [
    [
      {
        label: "Open record",
        icon: "i-lucide-arrow-up-right",
        onSelect() {
          void openBook(book);
        },
      },
      {
        label: "Edit book",
        icon: "i-lucide-pencil",
        onSelect() {
          void navigateTo(editBookRoute(book));
        },
      },
    ],
    [
      {
        label: "Print all labels",
        icon: "i-lucide-printer",
        disabled: book.totalCopies === 0,
        onSelect() {
          void printAllCopies(book);
        },
      },
    ],
  ];
}

async function openBook(
  book: CatalogBook,
): Promise<void> {
  await navigateTo(bookRoute(book));
}

async function printAllCopies(
  book: CatalogBook,
) {
  if (book.copies.length === 0) {
    toast.add({
      title: "No barcode labels",
      description:
        "This book does not have any physical copies.",
      color: "warning",
      icon: "i-lucide-printer",
    });

    return;
  }

  printQueue.setPrintQueue(
    book.copies.map((copy) => ({
      controlNumber:
        copy.accession_number || copy.control_number,
      title: book.title,
      author: book.author,
      shelfLocation:
        copy.shelf_location ?? "",
    })),
    bookRoute(book),
  );

  await navigateTo(
    "/librarian/books/print",
  );
}

async function exportInventory(): Promise<void> {
  if (isExporting.value) {
    return;
  }

  isExporting.value = true;

  try {
    const response =
      await auth.authFetch<ExportInventoryResponse>(
        "/api/books/export-inventory",
        {
          method: "GET",
        },
      );

    await inventoryExcel.downloadInventoryExport(
      response.data,
    );

    toast.add({
      title: "Inventory exported",
      description: `${response.data.length} physical ${
        response.data.length === 1 ? "copy was" : "copies were"
      } written to the Excel file.`,
      color: "success",
      icon: "i-lucide-file-check-2",
    });
  } catch (error) {
    if (getHttpStatus(error) === 401) {
      auth.clearSession();

      await navigateTo({
        path: "/",
        query: {
          redirect: "/librarian/books",
        },
      });

      return;
    }

    toast.add({
      title: "Export failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-file-x-2",
    });
  } finally {
    isExporting.value = false;
  }
}

function normalizeBarcode(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .toLowerCase();
}

function findMatchingCopy(
  book: CatalogBook,
  barcode = lastScannedBarcode.value,
): BookCopy | undefined {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!normalizedBarcode) {
    return undefined;
  }

  return book.copies.find((copy) =>
    [
      copy.accession_number || copy.control_number,
      copy.accession_number,
    ].some(
      (value) =>
        normalizeBarcode(value) === normalizedBarcode,
    ),
  );
}

async function handlePhysicalBookBarcodeDetected(
  result: BarcodeScanResult,
) {
  const barcode = result.value.trim();

  if (
    !barcode ||
    isBarcodeSearching.value ||
    isLoading.value
  ) {
    return;
  }

  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = undefined;
  }

  isBarcodeSearching.value = true;
  isApplyingBarcodeSearch.value = true;
  lastScannedBarcode.value = barcode;
  search.value = barcode;
  selectedShelfLocation.value = "";
  page.value = 1;

  try {
    await nextTick();
    await loadBooks(barcode);

    const matchingBook = books.value.find((book) =>
      findMatchingCopy(book, barcode),
    );
    const matchingCopy = matchingBook
      ? findMatchingCopy(matchingBook, barcode)
      : undefined;

    if (matchingBook && matchingCopy) {
      toast.add({
        title: "Physical book found",
        description: `${matchingBook.title} • ${
          matchingCopy.accession_number ||
          matchingCopy.control_number ||
          barcode
        } • ${matchingCopy.copy_status}`,
        color: "success",
        icon: "i-lucide-book-check",
      });
    } else {
      toast.add({
        title: "Physical book not found",
        description:
          "No book copy in the collection matches the scanned barcode or accession number.",
        color: "warning",
        icon: "i-lucide-scan-search",
      });
    }
  } finally {
    isBarcodeSearching.value = false;

    await nextTick();
    isApplyingBarcodeSearch.value = false;
  }
}

function clearFilters() {
  search.value = "";
  lastScannedBarcode.value = "";
  selectedShelfLocation.value = "";
  page.value = 1;
}

let searchTimer:
  | ReturnType<typeof setTimeout>
  | undefined;

watch(search, () => {
  if (isApplyingBarcodeSearch.value) {
    return;
  }

  lastScannedBarcode.value = "";

  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    page.value = 1;
    void loadBooks();
  }, 350);
});

watch(selectedShelfLocation, () => {
  if (isApplyingBarcodeSearch.value) {
    return;
  }

  page.value = 1;
  void loadBooks();
});

watch(page, () => {
  if (isApplyingBarcodeSearch.value) {
    return;
  }

  void loadBooks();
});

onMounted(() => {
  void Promise.all([
    referenceData.loadOperational(),
    loadBooks(),
  ]).catch(() => undefined);
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});
</script>

<template>
  <UContainer class="sncbt-page-shell">
    <div class="space-y-6 pb-12">
      <LibrarianPageHeader
        eyebrow="Books & Collection"
        title="Library Collection"
        description="Search and manage book titles, physical copies, accession numbers, barcodes, and inventory records from one workspace."
        icon="i-lucide-library"
      >
        <template #actions>
          <UBadge color="neutral" variant="soft" class="self-center">
            {{ totalBooks }} {{ totalBooks === 1 ? "title" : "titles" }}
          </UBadge>
          <UButton to="/librarian/books/import" label="Import Excel" icon="i-lucide-file-up" color="neutral" variant="outline" />
          <UButton label="Export Excel" icon="i-lucide-file-down" color="neutral" variant="outline" :loading="isExporting" @click="exportInventory" />
          <UButton to="/librarian/books/copies" label="Physical Copies" icon="i-lucide-book-copy" color="neutral" variant="outline" />
          <UButton to="/librarian/books/register" label="Register Book" icon="i-lucide-plus" color="primary" />
        </template>
      </LibrarianPageHeader>

      <UCard>
        <div
          class="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem_auto]"
        >
          <div class="space-y-2">
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-stretch"
            >
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search books or enter a Dewey range, e.g. 001 - 099"
                size="lg"
                :loading="isLoading"
                class="min-w-0 flex-1"
              >
                <template #trailing>
                  <UKbd>Enter</UKbd>
                </template>
              </UInput>

              <LiveBarcodeScanner
                :disabled="isLoading || isBarcodeSearching"
                title="Scan Physical Book Barcode"
                button-label="Scan Book"
                ready-description="Place the complete physical book barcode inside the guide."
                processing-label="Searching collection"
                processing-description="Please wait while the physical book is being located."
                storage-key="sncbt-book-collection-camera"
                :duplicate-cooldown-ms="5000"
                :detection-hold-ms="900"
                @detected="handlePhysicalBookBarcodeDetected"
              />
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs">
              <p class="text-muted">
                Search by title, author, subject, call number, ISBN, author code, or accession number.
                For a Dewey range, enter <span class="font-medium text-highlighted">001 - 099</span>.
              </p>

              <UBadge
                v-if="activeClassificationRange"
                color="primary"
                variant="soft"
                icon="i-lucide-list-filter"
              >
                Dewey range: {{ activeClassificationRange.label }}
              </UBadge>
            </div>
          </div>

          <USelect
            v-model="selectedShelfLocation"
            :items="shelfLocationItems"
            value-key="value"
            icon="i-lucide-map-pin"
            size="lg"
            class="w-full"
          />

          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="lg"
            :loading="isLoading"
            @click="loadBooks"
          />
        </div>
      </UCard>

      <div
        class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <UCard class="sncbt-metric-card block"> 
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <UIcon
                name="i-lucide-library"
                class="size-5"
              />
            </div>

            <div>
              <p
                class="text-2xl font-bold text-highlighted"
              >
                {{ totalBooks }}
              </p>
              <p class="text-xs text-muted">
                Book titles
              </p>
            </div>
          </div>
        </UCard>

        <UCard class="sncbt-metric-card block">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info"
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
                {{ copiesOnPage }}
              </p>
              <p class="text-xs text-muted">
                Copies shown
              </p>
            </div>
          </div>
        </UCard>

        <UCard class="sncbt-metric-card block">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
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
                {{ availableOnPage }}
              </p>
              <p class="text-xs text-muted">
                Available shown
              </p>
            </div>
          </div>
        </UCard>

        <UCard class="sncbt-metric-card block">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning"
            >
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-5"
              />
            </div>

            <div>
              <p
                class="text-2xl font-bold text-warning"
              >
                {{ attentionOnPage }}
              </p>
              <p class="text-xs text-muted">
                Need attention
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <UAlert
        v-if="loadError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="The catalog could not be loaded"
        :description="loadError"
        :actions="[
          {
            label: 'Try again',
            color: 'error',
            variant: 'outline',
            onClick: loadBooks,
          },
        ]"
      />

      <div
        v-if="isLoading"
        class="grid gap-4 xl:grid-cols-2"
      >
        <UCard
          v-for="item in 6"
          :key="item"
        >
          <div class="flex gap-4">
            <USkeleton
              class="h-52 w-full shrink-0 rounded-2xl sm:min-h-[248px] sm:w-40"
            />

            <div class="flex-1 space-y-3">
              <USkeleton class="h-5 w-3/4" />
              <USkeleton class="h-4 w-1/2" />
              <USkeleton class="h-16 w-full" />
              <USkeleton class="h-9 w-40" />
            </div>
          </div>
        </UCard>
      </div>

      <div
        v-else-if="books.length > 0"
        class="grid gap-4 xl:grid-cols-2"
      >
        <UCard
          v-for="book in books"
          :key="book.documentId ?? book.id"
          class="group transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-neutral-950/5 motion-reduce:transform-none dark:hover:shadow-black/20"
        >
          <div
            class="flex flex-col gap-5 sm:flex-row"
          >
            <button
              type="button"
              class="relative flex min-h-52 w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-inset transition-[transform,box-shadow] duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[248px] sm:w-40 sm:self-stretch"
              :class="bookCoverTheme(book)"
              :aria-label="`Open ${book.title}`"
              @click="openBook(book)"
            >
              <span
                class="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-white/40 blur-sm dark:bg-white/5"
                aria-hidden="true"
              />
              <span
                class="pointer-events-none absolute -bottom-10 -left-10 size-32 rounded-full bg-white/35 blur-sm dark:bg-white/5"
                aria-hidden="true"
              />
              <span
                class="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-current opacity-40"
                aria-hidden="true"
              />
              <span
                class="pointer-events-none absolute inset-x-5 top-[45%] border-t border-current/10"
                aria-hidden="true"
              />

              <span
                class="relative flex h-full w-full flex-col p-4 text-left sm:p-5"
              >
                <span
                  class="flex size-12 items-center justify-center rounded-xl bg-white/75 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-950/35 dark:ring-white/10"
                >
                  <UIcon
                    name="i-lucide-book-open"
                    class="size-6.5 transition-transform duration-200 group-hover:scale-105"
                  />
                </span>

                <span class="mt-auto min-w-0">
                  <span
                    class="block text-[10px] font-bold uppercase tracking-[0.2em] opacity-65"
                  >
                    SNCBT Library
                  </span>
                  <span
                    class="mt-2 block break-words text-lg font-bold leading-tight tracking-tight sm:text-xl"
                  >
                    {{ bookCoverLabel(book) }}
                  </span>
                  <span
                    class="mt-1.5 block truncate text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60"
                  >
                    {{ bookCoverSecondaryLabel(book) }}
                  </span>
                  <span
                    class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-950/25 dark:ring-white/10"
                  >
                    <UIcon name="i-lucide-library" class="size-3" />
                    Collection
                  </span>
                </span>
              </span>
            </button>

            <div class="min-w-0 flex-1">
              <div
                class="flex items-start justify-between gap-3"
              >
                <button
                  type="button"
                  class="min-w-0 flex-1 text-left focus-visible:outline-none"
                  @click="openBook(book)"
                >
                  <h2
                    class="line-clamp-2 text-lg font-semibold leading-snug text-highlighted transition-colors hover:text-primary focus-visible:text-primary"
                  >
                    {{ book.title }}
                  </h2>

                  <p
                    class="mt-1 truncate text-sm text-muted"
                  >
                    {{ book.author }}
                  </p>
                </button>

                <div class="flex shrink-0 items-center gap-1.5">
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

                  <UDropdownMenu
                    :items="bookActionItems(book)"
                    :content="{ align: 'end' }"
                    :ui="{ content: 'w-52' }"
                  >
                    <UButton
                      icon="i-lucide-ellipsis-vertical"
                      color="neutral"
                      variant="ghost"
                      square
                      :aria-label="`Actions for ${book.title}`"
                    />
                  </UDropdownMenu>
                </div>
              </div>

              <div
                class="mt-4 grid gap-2 text-sm sm:grid-cols-2"
              >
                <div>
                  <p class="text-xs text-muted">
                    ISBN
                  </p>
                  <p
                    class="truncate font-medium text-highlighted"
                  >
                    {{ book.isbn || "Not provided" }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted">
                    Call number
                  </p>
                  <p
                    class="truncate font-mono font-medium text-highlighted"
                  >
                    {{ book.call_number || "Not provided" }}
                  </p>
                </div>
              </div>

              <div
                class="mt-4 flex flex-wrap gap-2"
              >
                <UBadge
                  color="neutral"
                  variant="soft"
                >
                  {{ book.totalCopies }} total
                </UBadge>

                <UBadge
                  :color="
                    book.availableCopies > 0
                      ? 'success'
                      : 'warning'
                  "
                  variant="soft"
                >
                  {{ book.availableCopies }}
                  available
                </UBadge>

                <UBadge
                  v-if="
                    book.attentionCopies > 0
                  "
                  color="error"
                  variant="soft"
                >
                  {{ book.attentionCopies }}
                  need attention
                </UBadge>
              </div>

              <div
                v-if="findMatchingCopy(book)"
                class="mt-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-3"
              >
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"
                >
                  <UIcon
                    name="i-lucide-scan-barcode"
                    class="size-4.5"
                  />
                </div>

                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wide text-success">
                    Matching physical copy found
                  </p>
                  <p class="mt-1 break-all font-mono text-sm font-semibold text-highlighted">
                    {{
                      findMatchingCopy(book)?.accession_number ||
                      findMatchingCopy(book)?.control_number
                    }}
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    Accession:
                    {{ findMatchingCopy(book)?.accession_number || "Not provided" }}
                    · Status:
                    {{ findMatchingCopy(book)?.copy_status }}
                    · Shelf:
                    {{ findMatchingCopy(book)?.shelf_location || "Not assigned" }}
                  </p>
                </div>
              </div>

              <div
                class="mt-5 flex flex-col gap-3 border-t border-default/80 pt-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <p class="text-xs font-medium text-muted">
                    Availability
                  </p>
                  <p
                    class="mt-0.5 text-sm font-semibold"
                    :class="book.availableCopies > 0 ? 'text-success' : 'text-warning'"
                  >
                    {{
                      book.availableCopies > 0
                        ? `${book.availableCopies} of ${book.totalCopies} copies ready`
                        : book.totalCopies > 0
                          ? 'No copies currently available'
                          : 'No physical copies registered'
                    }}
                  </p>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:self-auto"
                  @click="openBook(book)"
                >
                  View record
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </button>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <UCard v-else>
        <div
          class="flex flex-col items-center px-4 py-12 text-center"
        >
          <div
            class="flex size-14 items-center justify-center rounded-2xl bg-elevated text-muted"
          >
            <UIcon
              name="i-lucide-book-open"
              class="size-7"
            />
          </div>

          <h2
            class="mt-4 font-semibold text-highlighted"
          >
            {{
              lastScannedBarcode
                ? "Physical book not found"
                : "No books found"
            }}
          </h2>

          <p
            class="mt-1 max-w-md text-sm text-muted"
          >
            {{
              lastScannedBarcode
                ? `No physical copy matches ${lastScannedBarcode}. Check the barcode or register the book copy first.`
                : "Change the search filters or register a new book to begin building the library collection."
            }}
          </p>

          <div
            class="mt-5 flex flex-wrap justify-center gap-2"
          >
            <UButton
              v-if="
                search ||
                selectedShelfLocation
              "
              label="Clear Filters"
              color="neutral"
              variant="outline"
              @click="clearFilters"
            />

            <UButton
              to="/librarian/books/register"
              label="Register Book"
              icon="i-lucide-plus"
              color="primary"
            />
          </div>
        </div>
      </UCard>

      <div
        v-if="pageCount > 1"
        class="flex flex-col gap-3 rounded-xl border border-default bg-default p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-muted">
          Page {{ page }} of {{ pageCount }}
        </p>

        <UPagination
          v-model:page="page"
          :total="totalBooks"
          :items-per-page="pageSize"
          show-edges
          :sibling-count="1"
        />
      </div>
    </div>
  </UContainer>
</template>
