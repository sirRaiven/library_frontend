<script setup lang="ts">
import PortalBookCard from "~/components/shared/PortalBookCard.vue";
definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Book Collection",
});

const portal = useFacultyPortal();
const toast = useToast();

const ALL_CATEGORIES = "__all_categories__";

const search = ref("");
const category = ref(ALL_CATEGORIES);
const availability = ref<"all" | "available">("all");
const sort = ref<"title-asc" | "author-asc" | "newest">("title-asc");
const page = ref(1);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const categoryItems = computed(() => [
  { label: "All Categories", value: ALL_CATEGORIES },
  ...portal.categories.value.map(value => ({ label: value, value })),
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

const resultSummary = computed(() => {
  const total = portal.pagination.value.total;
  if (!total) return "No book titles found";
  return `${total.toLocaleString()} book title${total === 1 ? "" : "s"} found`;
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
  void load();
});
watch(page, load);
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void load();
  }, 350);
});

onMounted(load);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <FacultyPageHeader
      eyebrow="Library Services"
      title="Book Collection"
      description="Search the physical collection, check copy availability, and find books for teaching or department use."
      icon="i-lucide-book-open"
    >
      <template #actions>
        <UButton label="Borrowed Books" icon="i-lucide-library-big" to="/faculty/borrowings" color="neutral" variant="outline" />
      </template>
    </FacultyPageHeader>

    <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-4 sm:p-5' }">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search title, author, ISBN, or call number" size="lg" class="w-full" />
        <USelect v-model="category" :items="categoryItems" value-key="value" label-key="label" icon="i-lucide-tags" size="lg" class="w-full" />
        <USelect v-model="availability" :items="availabilityItems" value-key="value" label-key="label" icon="i-lucide-book-check" size="lg" class="w-full" />
        <USelect v-model="sort" :items="sortItems" value-key="value" label-key="label" icon="i-lucide-arrow-up-down" size="lg" class="w-full" />
      </div>
    </UCard>

    <div>
      <h2 class="text-lg font-bold text-highlighted">Catalog Results</h2>
      <p class="text-sm text-muted">{{ resultSummary }}</p>
    </div>

    <div v-if="portal.loading.value && !portal.books.value.length" class="grid gap-4 lg:grid-cols-2">
      <UCard v-for="item in 6" :key="item" :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex min-h-56 flex-col sm:flex-row">
          <USkeleton class="h-48 w-full rounded-none sm:h-auto sm:w-40" />
          <div class="flex-1 space-y-4 p-5">
            <USkeleton class="h-5 w-4/5" />
            <USkeleton class="h-4 w-1/2" />
            <USkeleton class="h-14 w-full" />
            <USkeleton class="mt-auto h-10 w-full" />
          </div>
        </div>
      </UCard>
    </div>

    <section v-else-if="portal.books.value.length" class="grid gap-4 lg:grid-cols-2">
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

    <div v-if="portal.pagination.value.pageCount > 1" class="flex justify-center mb-14">
      <UPagination v-model:page="page" :total="portal.pagination.value.total" :items-per-page="portal.pagination.value.pageSize" />
    </div>
  </div>
</template>
