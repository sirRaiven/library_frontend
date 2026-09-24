<script setup lang="ts">
import StudentBookCard from "~/components/student/StudentBookCard.vue";
import AppFilterBar from "~/components/shared/AppFilterBar.vue";
import type { StudentBookFilters } from "~/composables/useStudentBooks";

const PAGE_SIZE = 12;
const ALL_CATEGORIES = "__all_categories__";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "Book Collection",
});

const route = useRoute();
const router = useRouter();
const collection = useStudentBooks();
const libraryOptions = useLibraryOptions();
const toast = useToast();

const search = ref(String(route.query.search ?? "").trim().slice(0, 120));
const initialCategory = String(route.query.category ?? "").trim();
const category = ref(
  initialCategory && initialCategory !== ALL_CATEGORIES
    ? initialCategory
    : ALL_CATEGORIES,
);
const availability = ref<"all" | "available">(
  route.query.availability === "available" ? "available" : "all",
);
const sort = ref<StudentBookFilters["sort"]>(
  ["title-asc", "author-asc", "newest"].includes(String(route.query.sort))
    ? (String(route.query.sort) as StudentBookFilters["sort"])
    : "title-asc",
);
const page = ref(Math.max(1, Number(route.query.page) || 1));

const categoryItems = computed(() => [
  { label: "All categories", value: ALL_CATEGORIES },
  ...libraryOptions.bookCategories.value,
]);

const availabilityItems = [
  { label: "All availability", value: "all" },
  { label: "Available now", value: "available" },
];

const sortItems = [
  { label: "Title: A to Z", value: "title-asc" },
  { label: "Author: A to Z", value: "author-asc" },
  { label: "Recently added", value: "newest" },
];

const activeFilterCount = computed(() =>
  [
    Boolean(search.value.trim()),
    category.value !== ALL_CATEGORIES,
    availability.value !== "all",
    sort.value !== "title-asc",
  ].filter(Boolean).length,
);

const resultSummary = computed(() => {
  const total = collection.pagination.value.total;

  if (!total) return "No book titles found";
  return `${total.toLocaleString()} book title${total === 1 ? "" : "s"} found`;
});

function currentFilters(): StudentBookFilters {
  return {
    search: search.value.trim(),
    category: category.value === ALL_CATEGORIES ? "" : category.value,
    availability: availability.value,
    sort: sort.value,
    page: page.value,
    pageSize: PAGE_SIZE,
  };
}

async function syncRoute() {
  const query: Record<string, string> = {};

  if (search.value.trim()) query.search = search.value.trim();
  if (category.value !== ALL_CATEGORIES) query.category = category.value;
  if (availability.value !== "all") query.availability = availability.value;
  if (sort.value !== "title-asc") query.sort = sort.value;
  if (page.value > 1) query.page = String(page.value);

  await router.replace({ query });
}

async function load(activity?: "view" | "search") {
  try {
    await collection.loadBooks(currentFilters(), activity);
    page.value = collection.pagination.value.page;
  } catch (error) {
    toast.add({
      title: "Unable to load the book collection",
      description: collection.error.value || useAuth().getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

async function submitSearch() {
  page.value = 1;
  await syncRoute();
  await load("search");
}

async function clearFilters() {
  search.value = "";
  category.value = ALL_CATEGORIES;
  availability.value = "all";
  sort.value = "title-asc";
  page.value = 1;
  collection.resetFilters();
  await syncRoute();
  await load("search");
}

watch(page, async (value, previous) => {
  if (value === previous || collection.loading.value) return;
  await syncRoute();
  await load();

  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

onMounted(async () => {
  try {
    await libraryOptions.loadOperational();
  } catch {
    // Collection remains usable; category filter can be retried separately.
  }
  await load();
});
</script>

<template>
  <div class="sncbt-page-shell sncbt-member-page space-y-6">
    <StudentPageHeader
      eyebrow="Library Services"
      title="Book Collection"
      description="Search the Library catalog and check which physical copies are currently available."
      icon="i-lucide-books"
    />

    <UAlert
      v-if="libraryOptions.error.value"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Book categories could not be refreshed"
      :description="libraryOptions.error.value"
      :actions="[{ label: 'Retry', onClick: () => libraryOptions.loadOperational() }]"
    />

    <form @submit.prevent="submitSearch">
      <AppFilterBar
        title="Find books"
        :active-count="activeFilterCount"
        :show-clear="activeFilterCount > 0"
        @clear="clearFilters"
      >
        <template #search>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search title, author, ISBN, publisher, category, or call number"
            autocomplete="off"
            size="lg"
            maxlength="120"
            class="w-full"
          />
        </template>

        <template #filters>
          <USelect
            v-model="category"
            :items="categoryItems"
            value-key="value"
            label-key="label"
            icon="i-lucide-tags"
            size="lg"
            class="w-full md:w-56"
            :disabled="libraryOptions.loading.value"
          />
          <USelect
            v-model="availability"
            :items="availabilityItems"
            value-key="value"
            label-key="label"
            icon="i-lucide-book-check"
            size="lg"
            class="w-full md:w-48"
          />
          <USelect
            v-model="sort"
            :items="sortItems"
            value-key="value"
            label-key="label"
            icon="i-lucide-arrow-up-down"
            size="lg"
            class="w-full md:w-48"
          />
        </template>

        <template #actions>
          <UButton
            type="submit"
            label="Search"
            icon="i-lucide-search"
            color="primary"
            :loading="collection.loading.value"
          />
          <UButton
            type="button"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Refresh book collection"
            :loading="collection.loading.value"
            @click="load()"
          />
        </template>
      </AppFilterBar>
    </form>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-bold text-highlighted">Catalog Results</h2>
        <p class="text-sm text-muted">{{ resultSummary }}</p>
      </div>

      <UBadge
        v-if="activeFilterCount"
        :label="`${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`"
        color="primary"
        variant="soft"
        icon="i-lucide-list-filter"
      />
    </div>

    <div
      v-if="collection.loading.value && !collection.books.value.length"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      <UCard
        v-for="index in PAGE_SIZE"
        :key="index"
        :ui="{ body: 'space-y-4 p-0 sm:p-0' }"
      >
        <USkeleton class="aspect-[4/3] w-full" />
        <div class="space-y-3 p-5">
          <USkeleton class="h-5 w-4/5" />
          <USkeleton class="h-4 w-1/2" />
          <USkeleton class="h-16 w-full" />
          <USkeleton class="h-9 w-full" />
        </div>
      </UCard>
    </div>

    <UAlert
      v-else-if="collection.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Book collection unavailable"
      :description="collection.error.value"
    >
      <template #actions>
        <UButton
          label="Try Again"
          color="error"
          variant="outline"
          @click="load()"
        />
      </template>
    </UAlert>

    <div
      v-else-if="collection.books.value.length"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      :class="collection.loading.value ? 'pointer-events-none opacity-60' : ''"
    >
      <StudentBookCard
        v-for="book in collection.books.value"
        :key="book.documentId"
        :book="book"
      />
    </div>

    <UCard v-else :ui="{ body: 'p-10 sm:p-14' }">
      <div class="mx-auto max-w-lg text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-2xl bg-elevated text-muted">
          <UIcon name="i-lucide-book-x" class="size-8" />
        </div>
        <h2 class="mt-5 text-lg font-bold text-highlighted">No matching books found</h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Check the spelling, remove one or more filters, or search using a broader title, author, ISBN, publisher, category, or call number.
        </p>
        <UButton
          v-if="activeFilterCount"
          label="Clear Search and Filters"
          icon="i-lucide-filter-x"
          color="neutral"
          variant="outline"
          class="mt-5"
          @click="clearFilters"
        />
      </div>
    </UCard>

    <div
      v-if="collection.pagination.value.total > PAGE_SIZE"
      class="flex justify-center border-t border-default pt-6"
    >
      <UPagination
        v-model:page="page"
        :total="collection.pagination.value.total"
        :items-per-page="collection.pagination.value.pageSize"
        :disabled="collection.loading.value"
      />
    </div>
  </div>
</template>
