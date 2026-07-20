<script setup lang="ts">
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
  category?: string | null;
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

interface CatalogBook extends BookRecord {
  copies: BookCopy[];
  totalCopies: number;
  availableCopies: number;
  attentionCopies: number;
}

const auth = useAuth();
const toast = useToast();
const printQueue = useBarcodePrintQueue();

const search = ref("");
const selectedCategory = ref("All Categories");
const page = ref(1);
const pageSize = 12;

const isLoading = ref(true);
const loadError = ref("");
const books = ref<CatalogBook[]>([]);
const totalBooks = ref(0);
const pageCount = ref(1);

const categoryItems = [
  "All Categories",
  "General Reference",
  "Computer Science",
  "Information Technology",
  "Business",
  "Education",
  "Engineering",
  "Literature",
  "History",
  "Science",
  "Mathematics",
  "Others",
];

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

function buildQuery(): Record<string, unknown> {
  const query: Record<string, unknown> = {
    "sort[0]": "createdAt:desc",
    "pagination[page]": page.value,
    "pagination[pageSize]": pageSize,
    "populate[book_copies][fields][0]":
      "control_number",
    "populate[book_copies][fields][1]":
      "shelf_location",
    "populate[book_copies][fields][2]":
      "copy_status",
    "populate[book_copies][fields][3]":
      "condition",
  };

  const keyword = search.value.trim();

  if (keyword) {
    query[
      "filters[$or][0][title][$containsi]"
    ] = keyword;
    query[
      "filters[$or][1][author][$containsi]"
    ] = keyword;
    query[
      "filters[$or][2][isbn][$containsi]"
    ] = keyword;
  }

  if (
    selectedCategory.value !==
    "All Categories"
  ) {
    query["filters[category][$eq]"] =
      selectedCategory.value;
  }

  return query;
}

async function loadBooks() {
  isLoading.value = true;
  loadError.value = "";

  try {
    const response =
      await auth.authFetch<BooksResponse>(
        "/api/books",
        {
          method: "GET",
          query: buildQuery(),
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
        copy.control_number,
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

function clearFilters() {
  search.value = "";
  selectedCategory.value =
    "All Categories";
  page.value = 1;
}

let searchTimer:
  | ReturnType<typeof setTimeout>
  | undefined;

watch(search, () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    page.value = 1;
    void loadBooks();
  }, 350);
});

watch(selectedCategory, () => {
  page.value = 1;
  void loadBooks();
});

watch(page, () => {
  void loadBooks();
});

onMounted(() => {
  void loadBooks();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="space-y-6">
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <div
            class="flex flex-wrap items-center gap-2"
          >
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Library Collection
            </h1>

            <UBadge
              color="neutral"
              variant="soft"
            >
              {{ totalBooks }} book
              {{
                totalBooks === 1
                  ? "title"
                  : "titles"
              }}
            </UBadge>
          </div>

          <p class="mt-1 text-sm text-muted">
            Search the catalog, open a book record,
            and manage its physical copies and
            barcodes from one place.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            to="/librarian/books/copies"
            label="Physical Copies"
            icon="i-lucide-book-copy"
            color="neutral"
            variant="outline"
          />

          <UButton
            to="/librarian/books/register"
            label="Register Book"
            icon="i-lucide-plus"
            color="success"
          />
        </div>
      </div>

      <UCard>
        <div
          class="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem_auto]"
        >
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search title, author, or ISBN"
            size="lg"
            class="w-full"
          />

          <USelect
            v-model="selectedCategory"
            :items="categoryItems"
            icon="i-lucide-tags"
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
        <UCard>
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

        <UCard>
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

        <UCard>
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

        <UCard>
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
              class="h-32 w-24 shrink-0 rounded-xl"
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
          class="group"
        >
          <div
            class="flex flex-col gap-5 sm:flex-row"
          >
            <button
              type="button"
              class="flex h-36 w-full shrink-0 items-center justify-center rounded-2xl border border-default bg-elevated transition-colors hover:bg-accented sm:w-28"
              :aria-label="`Open ${book.title}`"
              @click="openBook(book)"
            >
              <UIcon
                name="i-lucide-book-open"
                class="size-10 text-muted transition-transform group-hover:scale-105"
              />
            </button>

            <div class="min-w-0 flex-1">
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <button
                  type="button"
                  class="min-w-0 text-left"
                  @click="openBook(book)"
                >
                  <h2
                    class="line-clamp-2 text-lg font-semibold text-highlighted hover:text-primary"
                  >
                    {{ book.title }}
                  </h2>

                  <p
                    class="mt-1 truncate text-sm text-muted"
                  >
                    {{ book.author }}
                  </p>
                </button>

                <UBadge
                  :color="
                    book.record_status ===
                    'Archived'
                      ? 'neutral'
                      : 'success'
                  "
                  variant="soft"
                  class="self-start"
                >
                  {{
                    book.record_status ??
                    "Active"
                  }}
                </UBadge>
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
                    Category
                  </p>
                  <p
                    class="truncate font-medium text-highlighted"
                  >
                    {{
                      book.category ||
                      "Uncategorized"
                    }}
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
                class="mt-5 flex flex-wrap gap-2"
              >
                <UButton
                  label="Open Record"
                  icon="i-lucide-arrow-right"
                  trailing
                  color="primary"
                  variant="soft"
                  @click="openBook(book)"
                />

                <UButton
                  label="Print All Labels"
                  icon="i-lucide-printer"
                  color="neutral"
                  variant="ghost"
                  :disabled="
                    book.totalCopies === 0
                  "
                  @click="printAllCopies(book)"
                />
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
            No books found
          </h2>

          <p
            class="mt-1 max-w-md text-sm text-muted"
          >
            Change the search filters or register a
            new book to begin building the library
            collection.
          </p>

          <div
            class="mt-5 flex flex-wrap justify-center gap-2"
          >
            <UButton
              v-if="
                search ||
                selectedCategory !==
                  'All Categories'
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
              color="success"
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
