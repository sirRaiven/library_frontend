<script setup lang="ts">
import BarcodeCard from "~/components/librarian/BarcodeCard.vue";

definePageMeta({
  layout: "librarian",
  title: "Physical Copies",
});

type CopyStatus =
  | "Available"
  | "Borrowed"
  | "Reserved"
  | "Damaged"
  | "Lost"
  | "Archived";

type CopyCondition =
  | "New"
  | "Good"
  | "Fair"
  | "Damaged";

interface RelatedBook {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
}

interface BookRelation {
  data?: RelatedBook | null;
}

interface BookCopyRecord {
  id?: number;
  documentId?: string;
  control_number: string;
  accession_number?: string | null;
  shelf_location?: string | null;
  copy_status: CopyStatus;
  condition?: CopyCondition | null;
  remarks?: string | null;
  createdAt?: string;
  book?: RelatedBook | BookRelation | null;
}

interface PhysicalCopy
  extends BookCopyRecord {
  relatedBook: RelatedBook | null;
  selected: boolean;
}

interface CopiesResponse {
  data: BookCopyRecord[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

const route = useRoute();
const auth = useAuth();
const toast = useToast();
const printQueue = useBarcodePrintQueue();

const search = ref(
  typeof route.query.search === "string"
    ? route.query.search
    : "",
);

const statusFilter = ref(
  typeof route.query.status === "string"
    ? route.query.status
    : "All Statuses",
);

const page = ref(1);
const pageSize = 12;

const copies = ref<PhysicalCopy[]>([]);
const isLoading = ref(true);
const loadError = ref("");
const totalCopies = ref(0);
const pageCount = ref(1);

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
  copies.value.filter(
    (copy) => copy.selected,
  ),
);

const allSelected = computed({
  get: () =>
    copies.value.length > 0 &&
    copies.value.every(
      (copy) => copy.selected,
    ),
  set: (value: boolean) => {
    copies.value.forEach((copy) => {
      copy.selected = value;
    });
  },
});

const availableShown = computed(
  () =>
    copies.value.filter(
      (copy) =>
        copy.copy_status === "Available",
    ).length,
);

const borrowedShown = computed(
  () =>
    copies.value.filter(
      (copy) =>
        copy.copy_status === "Borrowed",
    ).length,
);

const attentionShown = computed(
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

function unwrapBook(
  relation: BookCopyRecord["book"],
): RelatedBook | null {
  if (!relation) {
    return null;
  }

  if (
    typeof relation === "object" &&
    "data" in relation
  ) {
    return relation.data ?? null;
  }

  return relation as RelatedBook;
}

function normalizeCopy(
  copy: BookCopyRecord,
): PhysicalCopy {
  return {
    ...copy,
    relatedBook: unwrapBook(copy.book),
    selected: false,
  };
}

function buildQuery(): Record<string, unknown> {
  const query: Record<string, unknown> = {
    "sort[0]": "createdAt:desc",
    "pagination[page]": page.value,
    "pagination[pageSize]": pageSize,
    "populate[book][fields][0]":
      "title",
    "populate[book][fields][1]":
      "author",
  };

  const keyword = search.value.trim();

  if (keyword) {
    query[
      "filters[$or][0][control_number][$containsi]"
    ] = keyword;
    query[
      "filters[$or][1][shelf_location][$containsi]"
    ] = keyword;
    query[
      "filters[$or][2][book][title][$containsi]"
    ] = keyword;
    query[
      "filters[$or][3][book][author][$containsi]"
    ] = keyword;
  }

  if (
    statusFilter.value !==
    "All Statuses"
  ) {
    query["filters[copy_status][$eq]"] =
      statusFilter.value;
  }

  return query;
}

async function loadCopies() {
  isLoading.value = true;
  loadError.value = "";

  try {
    const response =
      await auth.authFetch<CopiesResponse>(
        "/api/book-copies",
        {
          method: "GET",
          query: buildQuery(),
        },
      );

    copies.value = response.data.map(
      normalizeCopy,
    );

    const pagination =
      response.meta?.pagination;

    totalCopies.value =
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
          redirect:
            "/librarian/books/copies",
        },
      });

      return;
    }

    loadError.value =
      auth.getErrorMessage(error);

    toast.add({
      title:
        "Unable to load physical copies",
      description: loadError.value,
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isLoading.value = false;
  }
}

function bookRoute(copy: PhysicalCopy) {
  const identifier =
    copy.relatedBook?.documentId ??
    copy.relatedBook?.id;

  return identifier
    ? `/librarian/books/${identifier}`
    : "/librarian/books";
}

async function printCopies(
  sourceCopies: PhysicalCopy[],
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
    sourceCopies.map((copy) => ({
      controlNumber:
        copy.accession_number || copy.control_number,
      title:
        copy.relatedBook?.title ??
        "Library Book",
      author:
        copy.relatedBook?.author ?? "",
      shelfLocation:
        copy.shelf_location ?? "",
    })),
    route.fullPath,
  );

  await navigateTo(
    "/librarian/books/print",
  );
}

function clearFilters() {
  search.value = "";
  statusFilter.value = "All Statuses";
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
    void loadCopies();
  }, 350);
});

watch(statusFilter, () => {
  page.value = 1;
  void loadCopies();
});

watch(page, () => {
  void loadCopies();
});

onMounted(() => {
  void loadCopies();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});
</script>

<template>
  <UContainer class="sncbt-page-shell sncbt-staff-page">
    <div class="space-y-6">
      <LibrarianPageHeader
        eyebrow="Books & Collection"
        title="Physical Copies"
        description="Search individual accession numbers, review copy status, verify barcode labels, and print labels for selected inventory items."
        icon="i-lucide-book-copy"
      >
        <template #actions>
          <UBadge color="neutral" variant="soft" class="self-center">{{ totalCopies }} {{ totalCopies === 1 ? "copy" : "copies" }}</UBadge>
          <UButton to="/librarian/books" label="Back to Collection" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
          <UButton label="Print Selected" icon="i-lucide-printer" color="neutral" variant="outline" :disabled="selectedCopies.length === 0" @click="printCopies(selectedCopies)" />
          <UButton to="/librarian/books/register" label="Register Book" icon="i-lucide-plus" color="primary" />
        </template>
      </LibrarianPageHeader>

      <UCard>
        <div
          class="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]"
        >
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search accession number, title, author, or shelf"
            size="lg"
            class="w-full"
          />

          <USelect
            v-model="statusFilter"
            :items="statusItems"
            icon="i-lucide-list-filter"
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
            @click="loadCopies"
          />
        </div>

        <div
          class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <UCheckbox
            v-model="allSelected"
            :label="`Select all shown (${copies.length})`"
          />

          <p class="text-sm text-muted">
            {{ selectedCopies.length }}
            selected for printing
          </p>
        </div>
      </UCard>

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
                Total inventory
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
                {{ availableShown }}
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
                {{ borrowedShown }}
              </p>
              <p class="text-xs text-muted">
                Borrowed shown
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
                {{ attentionShown }}
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
        title="The inventory could not be loaded"
        :description="loadError"
        :actions="[
          {
            label: 'Try again',
            color: 'error',
            variant: 'outline',
            onClick: loadCopies,
          },
        ]"
      />

      <div
        v-if="isLoading"
        class="grid gap-4 xl:grid-cols-2"
      >
        <USkeleton
          v-for="item in 6"
          :key="item"
          class="h-72 rounded-2xl"
        />
      </div>

      <div
        v-else-if="copies.length > 0"
        class="grid gap-4 xl:grid-cols-2"
      >
        <div
          v-for="copy in copies"
          :key="
            copy.documentId ??
            copy.id ??
            copy.control_number
          "
          class="space-y-3 border border-default bg-default rounded-3xl shadow-sm"
        >
          <div
            class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <UCheckbox
              v-model="copy.selected"
              label="Select for printing"
            />

            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="copy.relatedBook"
                :to="bookRoute(copy)"
                label="Open Book"
                icon="i-lucide-external-link"
                color="neutral"
                variant="ghost"
                size="sm"
              />

              <UButton
                label="Print"
                icon="i-lucide-printer"
                color="primary"
                variant="soft"
                size="sm"
                @click="printCopies([copy])"
              />
            </div>
          </div>

          <BarcodeCard
            :control-number="
              copy.accession_number || copy.control_number
            "
            :title="
              copy.relatedBook?.title ??
              'Library Book'
            "
            :author="
              copy.relatedBook?.author ?? ''
            "
            :shelf-location="
              copy.shelf_location ?? ''
            "
            :status="copy.copy_status"
            :condition="
              copy.condition ??
              'Not specified'
            "
            compact
          />
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

          <h2
            class="mt-4 font-semibold text-highlighted"
          >
            No physical copies found
          </h2>

          <p
            class="mt-1 max-w-md text-sm text-muted"
          >
            Change the search filters or register a
            book to generate its physical copies and
            barcode labels.
          </p>

          <div
            class="mt-5 flex flex-wrap justify-center gap-2"
          >
            <UButton
              v-if="
                search ||
                statusFilter !==
                  'All Statuses'
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
          :total="totalCopies"
          :items-per-page="pageSize"
          show-edges
          :sibling-count="1"
        />
      </div>
    </div>
  </UContainer>
</template>
