<script setup lang="ts">
import FacultyPageHeader from "~/components/faculty/FacultyPageHeader.vue";
import PortalBookCard from "~/components/shared/PortalBookCard.vue";
import AppFilterBar from "~/components/shared/AppFilterBar.vue";

definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Book Collection",
});

const route = useRoute();
const router = useRouter();
const portal = useFacultyPortal();
const libraryOptions = useLibraryOptions();
const toast = useToast();

const ALL_CATEGORIES = "__all_categories__";

function queryText(name: string, maxLength = 120): string {
  const value = route.query[name];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

const search = ref(queryText("search"));
const category = ref(queryText("category", 160) || ALL_CATEGORIES);
const availability = ref<"all" | "available">(route.query.availability === "available" ? "available" : "all");
const sort = ref<"title-asc" | "author-asc" | "newest">(
  ["title-asc", "author-asc", "newest"].includes(String(route.query.sort))
    ? (String(route.query.sort) as "title-asc" | "author-asc" | "newest")
    : "title-asc",
);
const page = ref(Math.max(1, Number(route.query.page) || 1));
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const categoryItems = computed(() => [
  { label: "All Categories", value: ALL_CATEGORIES },
  ...libraryOptions.bookCategories.value,
]);
const availabilityItems = [
  { label: "All Books", value: "all" },
  { label: "Available Now", value: "available" },
];
const sortItems = [
  { label: "Title A–Z", value: "title-asc" },
  { label: "Author A–Z", value: "author-asc" },
  { label: "Newest Added", value: "newest" },
];

function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (search.value.trim()) query.search = search.value.trim();
  if (category.value !== ALL_CATEGORIES) query.category = category.value;
  if (availability.value !== "all") query.availability = availability.value;
  if (sort.value !== "title-asc") query.sort = sort.value;
  if (page.value > 1) query.page = String(page.value);
  void router.replace({ query });
}

const resultsAnnouncement = computed(() => {
  const total = portal.pagination.value.total;
  return `${total} book${total === 1 ? "" : "s"} found in the Faculty collection view.`;
});

async function load() {
  try {
    await portal.loadBooks({
      search: search.value,
      category: category.value === ALL_CATEGORIES ? undefined : category.value,
      availability: availability.value,
      sort: sort.value,
      page: page.value,
      pageSize: 12,
    });
  } catch (error) {
    toast.add({
      title: "Book collection unavailable",
      description: portal.error.value || "Please try again.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

watch([category, availability, sort], () => {
  page.value = 1;
  syncRouteQuery();
  void load();
});
watch(page, () => {
  syncRouteQuery();
  void load();
});
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    syncRouteQuery();
    void load();
  }, 350);
});

onMounted(async () => {
  try {
    await libraryOptions.loadOperational();
  } catch {
    // Collection remains usable; category filter can be retried separately.
  }
  await load();
});
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <UContainer class="sncbt-page-shell sncbt-member-page">
    <div class="w-full space-y-6">
      <FacultyPageHeader
        eyebrow="Library collection"
        title="Book Collection"
        description="Search the physical collection and check copy availability. Bring the book and your Faculty ID to the Library counter for checkout."
        icon="i-lucide-book-open"
      >
        <template #actions>
          <UButton
            label="My Borrowed Books"
            icon="i-lucide-library-big"
            to="/faculty/borrowings"
            color="neutral"
            variant="outline"
          />
        </template>
      </FacultyPageHeader>

      <UAlert
        v-if="libraryOptions.error.value"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Book categories could not be refreshed"
        :description="libraryOptions.error.value"
        :actions="[{ label: 'Retry', onClick: () => libraryOptions.loadOperational() }]"
      />

      <AppFilterBar
        title="Find books"
        :active-count="(search.trim() ? 1 : 0) + (category !== ALL_CATEGORIES ? 1 : 0) + (availability !== 'all' ? 1 : 0) + (sort !== 'title-asc' ? 1 : 0)"
      >
        <template #search>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search title, author, ISBN, or call number"
            class="w-full"
            aria-label="Search Faculty book collection"
          />
        </template>

        <template #filters>
          <USelect
            v-model="category"
            :items="categoryItems"
            value-key="value"
            label-key="label"
            class="w-full md:w-56"
            :disabled="libraryOptions.loading.value"
            aria-label="Book category"
          />
          <USelect
            v-model="availability"
            :items="availabilityItems"
            value-key="value"
            label-key="label"
            class="w-full md:w-48"
            aria-label="Book availability"
          />
          <USelect
            v-model="sort"
            :items="sortItems"
            value-key="value"
            label-key="label"
            class="w-full md:w-48"
            aria-label="Sort Faculty book collection"
          />
        </template>

        <template #actions>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Refresh book collection"
            :loading="portal.loading.value"
            @click="load"
          />
        </template>
      </AppFilterBar>

      <p class="sr-only" aria-live="polite" aria-atomic="true">{{ resultsAnnouncement }}</p>

      <div
        v-if="portal.loading.value && !portal.books.value.length"
        class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      >
        <USkeleton v-for="item in 6" :key="item" class="h-64 rounded-2xl" />
      </div>

      <section
        v-else-if="portal.books.value.length"
        class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        :class="portal.loading.value ? 'pointer-events-none opacity-60' : ''"
      >
        <PortalBookCard
          v-for="book in portal.books.value"
          :key="book.documentId"
          :title="book.title"
          :author="book.author"
          :document-id="book.documentId"
          :to="`/faculty/books/${book.documentId}`"
          :isbn="book.isbn"
          :category="book.category"
          :call-number="book.callNumber"
          :cover="book.cover"
          :status="book.availability.status"
          :total-copies="book.availability.totalCopies"
          :available-copies="book.availability.availableCopies"
        />
      </section>

      <UCard v-else :ui="{ root: 'ring-1 ring-default', body: 'p-12 text-center' }">
        <UIcon name="i-lucide-book-x" class="mx-auto size-12 text-dimmed" />
        <h2 class="mt-4 text-lg font-semibold text-highlighted">No matching books found</h2>
        <p class="mt-2 text-sm text-muted">Try a different search, category, or availability filter.</p>
      </UCard>

      <div v-if="portal.pagination.value.pageCount > 1" class="flex justify-center">
        <UPagination
          v-model:page="page"
          :total="portal.pagination.value.total"
          :items-per-page="portal.pagination.value.pageSize"
          aria-label="Faculty book collection pages"
        />
      </div>
    </div>
  </UContainer>
</template>
