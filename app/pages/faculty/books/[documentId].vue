<script setup lang="ts">
definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Book Details",
});

const route = useRoute();
const portal = useFacultyPortal();
const toast = useToast();

const documentId = computed(() => String(route.params.documentId ?? ""));
const book = computed(() => portal.selectedBook.value);

function availabilityColor(status: string) {
  return status === "Available" ? "success" as const : "neutral" as const;
}

async function load() {
  try {
    await portal.loadBook(documentId.value);
  } catch (error) {
    toast.add({
      title: "Book details unavailable",
      description: portal.error.value || "Please return to the collection and try again.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

watch(documentId, load, { immediate: true });
</script>

<template>
  <div class="sncbt-page-shell sncbt-page-shell-narrow space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UButton label="Back to Collection" icon="i-lucide-arrow-left" to="/faculty/books" color="neutral" variant="ghost" />
      <UButton label="View Borrowed Books" icon="i-lucide-library-big" to="/faculty/borrowings" color="neutral" variant="outline" />
    </div>

    <div v-if="portal.detailLoading.value" class="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <USkeleton class="h-[26rem] rounded-3xl" />
      <USkeleton class="h-[26rem] rounded-3xl" />
    </div>

    <UCard v-else-if="book" :ui="{ root: 'overflow-hidden ring-1 ring-default', body: 'p-0' }">
      <div class="grid lg:grid-cols-[20rem_1fr]">
        <div class="flex min-h-80 items-center justify-center border-b border-default bg-elevated/50 p-8 lg:border-b-0 lg:border-e">
          <div class="flex h-80 w-56 items-center justify-center overflow-hidden rounded-2xl border border-default bg-default shadow-sm">
            <img v-if="book.cover?.url" :src="book.cover.url" :alt="book.cover.alternativeText || book.title" class="size-full object-cover">
            <UIcon v-else name="i-lucide-book-open" class="size-16 text-dimmed" />
          </div>
        </div>

        <div class="p-6 sm:p-8">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge :label="book.availability.status" :color="availabilityColor(book.availability.status)" variant="soft" />
            <UBadge v-if="book.category" :label="book.category" color="neutral" variant="outline" />
          </div>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-highlighted">{{ book.title }}</h1>
          <p class="mt-2 text-lg text-muted">{{ book.author }}</p>

          <dl class="mt-8 grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-default bg-elevated/30 p-4">
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Available copies</dt>
              <dd class="mt-2 text-2xl font-bold text-highlighted">{{ book.availability.availableCopies }} of {{ book.availability.totalCopies }}</dd>
            </div>
            <div class="rounded-2xl border border-default bg-elevated/30 p-4">
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Call number</dt>
              <dd class="mt-2 font-semibold text-highlighted">{{ book.callNumber || 'Not assigned' }}</dd>
            </div>
            <div class="rounded-2xl border border-default bg-elevated/30 p-4">
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">ISBN</dt>
              <dd class="mt-2 font-semibold text-highlighted">{{ book.isbn || 'Not recorded' }}</dd>
            </div>
            <div class="rounded-2xl border border-default bg-elevated/30 p-4">
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Publisher / Edition</dt>
              <dd class="mt-2 font-semibold text-highlighted">{{ [book.publisher, book.edition].filter(Boolean).join(' · ') || 'Not recorded' }}</dd>
            </div>
          </dl>

          <div class="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-info" class="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h2 class="font-semibold text-highlighted">How to borrow this book</h2>
                <p class="mt-1 text-sm leading-6 text-muted">
                  Visit the Library, present your Faculty ID, and bring an available physical copy to the counter. The Librarian will assign the due date based on the annual department cycle or the next CHED/TESDA audit schedule.
                </p>
              </div>
            </div>
          </div>

          <div v-if="book.availability.shelfLocations?.length" class="mt-6">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Shelf locations</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <UBadge v-for="location in book.availability.shelfLocations" :key="location" :label="location" color="neutral" variant="soft" />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <UCard v-else :ui="{ root: 'ring-1 ring-default', body: 'p-12 text-center' }">
      <UIcon name="i-lucide-book-x" class="mx-auto size-12 text-dimmed" />
      <h2 class="mt-4 text-lg font-semibold text-highlighted">Book not found</h2>
      <p class="mt-2 text-sm text-muted">The requested book may have been removed or is temporarily unavailable.</p>
      <UButton label="Return to Collection" to="/faculty/books" class="mt-5" />
    </UCard>
  </div>
</template>
