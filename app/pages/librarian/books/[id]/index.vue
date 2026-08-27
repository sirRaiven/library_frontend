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
    Borrowed: "warning",
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
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div class="flex items-start gap-3">
          <UButton
            to="/librarian/books"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            aria-label="Back to Library Collection"
          />

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h1
                class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
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

            <p class="mt-1 text-sm text-muted">
              {{ book?.author || "View bibliographic information and physical copies." }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            :to="editRoute"
            label="Edit Book"
            icon="i-lucide-pencil"
            color="neutral"
            variant="outline"
            :disabled="!book"
          />

          <UButton
            label="Print All Labels"
            icon="i-lucide-printer"
            color="neutral"
            variant="outline"
            :disabled="copies.length === 0"
            @click="queueLabels(copies)"
          />

          <UButton
            to="/librarian/books/register"
            label="Register Another"
            icon="i-lucide-plus"
            color="primary"
          />
        </div>
      </div>

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
                class="flex size-11 items-center justify-center rounded-xl bg-warning/10 text-warning"
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
                class="flex min-h-44 items-center justify-center rounded-2xl border border-default bg-elevated"
              >
                <UIcon name="i-lucide-book-open" class="size-14 text-muted" />
              </div>

              <div>
                <h2 class="text-xl font-bold text-highlighted">
                  {{ book.title }}
                </h2>
                <p class="mt-1 text-sm text-muted">{{ book.author }}</p>
              </div>

              <dl class="space-y-3 text-sm">
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Classification</dt>
                  <dd class="max-w-48 text-right font-mono font-semibold text-highlighted">
                    {{ book.classification_number || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Author number</dt>
                  <dd class="max-w-48 text-right font-mono font-semibold text-highlighted">
                    {{ book.author_number || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Call number</dt>
                  <dd class="max-w-48 text-right font-mono font-semibold text-highlighted">
                    {{ book.call_number || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Subject</dt>
                  <dd class="max-w-48 text-right font-semibold text-highlighted">
                    {{ book.subject || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">ISBN</dt>
                  <dd class="max-w-48 text-right font-semibold text-highlighted">
                    {{ book.isbn || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Publisher</dt>
                  <dd class="max-w-48 text-right font-semibold text-highlighted">
                    {{ book.publisher || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Edition</dt>
                  <dd class="max-w-48 text-right font-semibold text-highlighted">
                    {{ book.edition || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Copyright</dt>
                  <dd class="font-semibold text-highlighted">
                    {{ book.copyright_year || "Not provided" }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Last updated</dt>
                  <dd class="max-w-48 text-right font-semibold text-highlighted">
                    {{ formatDate(book.updatedAt) }}
                  </dd>
                </div>
              </dl>

              <p
                v-if="book.description"
                class="rounded-xl border border-default bg-elevated/50 p-3 text-sm leading-6 text-muted"
              >
                {{ book.description }}
              </p>
            </div>
          </UCard>

          <div class="space-y-4">
            <UCard>
              <div
                class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
              >
                <div>
                  <h2 class="text-lg font-semibold text-highlighted">
                    Physical Copies and Barcodes
                  </h2>
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
              <div
                v-for="copy in filteredCopies"
                :key="copy.documentId ?? copy.control_number"
                class="space-y-2"
              >
                <div class="flex items-center justify-between gap-3 px-1">
                  <UCheckbox
                    v-model="copy.selected"
                    :label="`Accession ${copy.accession_number || 'Not assigned'}`"
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

                <div
                  class="grid grid-cols-2 gap-2 rounded-xl border border-default bg-elevated/40 p-3 text-xs"
                >
                  <div>
                    <p class="text-muted">Inventory year</p>
                    <p class="mt-1 font-semibold text-highlighted">
                      {{ copy.inventory_date || "Not provided" }}
                    </p>
                  </div>
                  <div>
                    <p class="text-muted">Price</p>
                    <p class="mt-1 font-semibold text-highlighted">
                      {{ formatPrice(copy.price) }}
                    </p>
                  </div>
                </div>
              </div>
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
