<script setup lang="ts">
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

function availabilityColor(status: string) {
  return status === "Available" ? "success" as const : "neutral" as const;
}

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
  <div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <section class="rounded-3xl border border-default bg-elevated/30 p-6 shadow-sm sm:p-8">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <UBadge label="Library collection" icon="i-lucide-book-open" color="primary" variant="soft" />
          <h1 class="mt-3 text-3xl font-bold text-highlighted">Find books for teaching and department use</h1>
          <p class="mt-2 text-sm leading-6 text-muted">
            Search the physical collection and check copy availability. Bring the book and your Faculty ID to the Library counter for checkout.
          </p>
        </div>
        <UButton label="My Borrowed Books" icon="i-lucide-library-big" to="/faculty/borrowings" color="neutral" variant="outline" />
      </div>
    </section>

    <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-4 sm:p-5' }">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search title, author, ISBN, or call number" class="w-full" />
        <USelect v-model="category" :items="categoryItems" value-key="value" label-key="label" class="w-full" />
        <USelect v-model="availability" :items="availabilityItems" value-key="value" label-key="label" class="w-full" />
        <USelect v-model="sort" :items="sortItems" value-key="value" label-key="label" class="w-full" />
      </div>
    </UCard>

    <div v-if="portal.loading.value && !portal.books.value.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <USkeleton v-for="item in 6" :key="item" class="h-64 rounded-2xl" />
    </div>

    <section v-else-if="portal.books.value.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <UCard
        v-for="book in portal.books.value"
        :key="book.documentId"
        :ui="{ root: 'h-full overflow-hidden ring-1 ring-default transition hover:-translate-y-0.5 hover:shadow-md', body: 'flex h-full flex-col p-5' }"
      >
        <div class="flex gap-4">
          <div class="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default bg-elevated">
            <img v-if="book.cover?.url" :src="book.cover.url" :alt="book.cover.alternativeText || book.title" class="size-full object-cover" loading="lazy">
            <UIcon v-else name="i-lucide-book-open" class="size-8 text-dimmed" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :label="book.availability.status" :color="availabilityColor(book.availability.status)" variant="soft" size="sm" />
              <UBadge v-if="book.category" :label="book.category" color="neutral" variant="outline" size="sm" />
            </div>
            <h2 class="mt-3 line-clamp-2 font-semibold text-highlighted">{{ book.title }}</h2>
            <p class="mt-1 line-clamp-1 text-sm text-muted">{{ book.author }}</p>
          </div>
        </div>

        <dl class="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div class="rounded-xl bg-elevated/60 p-3">
            <dt class="text-muted">Available copies</dt>
            <dd class="mt-1 text-lg font-bold text-highlighted">{{ book.availability.availableCopies }}</dd>
          </div>
          <div class="rounded-xl bg-elevated/60 p-3">
            <dt class="text-muted">Call number</dt>
            <dd class="mt-1 truncate font-semibold text-highlighted">{{ book.callNumber || 'Not assigned' }}</dd>
          </div>
        </dl>

        <div class="mt-auto flex items-center justify-between gap-3 pt-5">
          <p class="text-xs text-muted">{{ book.availability.totalCopies }} physical {{ book.availability.totalCopies === 1 ? 'copy' : 'copies' }}</p>
          <UButton label="View Details" icon="i-lucide-arrow-right" trailing :to="`/faculty/books/${book.documentId}`" color="primary" variant="soft" size="sm" />
        </div>
      </UCard>
    </section>

    <UCard v-else :ui="{ root: 'ring-1 ring-default', body: 'p-12 text-center' }">
      <UIcon name="i-lucide-book-x" class="mx-auto size-12 text-dimmed" />
      <h2 class="mt-4 text-lg font-semibold text-highlighted">No matching books found</h2>
      <p class="mt-2 text-sm text-muted">Try a different search, category, or availability filter.</p>
    </UCard>

    <div v-if="portal.pagination.value.pageCount > 1" class="flex justify-center">
      <UPagination v-model:page="page" :total="portal.pagination.value.total" :items-per-page="portal.pagination.value.pageSize" />
    </div>
  </div>
</template>
