<script setup lang="ts">
const route = useRoute();
const collection = useStudentBooks();
const toast = useToast();

const bookIdentifier = computed(() => {
  const value = route.params.documentId;
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
});

const book = computed(() => collection.selectedBook.value);

const availabilityColor = computed<"success" | "warning" | "neutral">(() => {
  if ((book.value?.availability.availableCopies ?? 0) > 0) return "success";
  if ((book.value?.availability.totalCopies ?? 0) > 0) return "warning";
  return "neutral";
});

const availabilityIcon = computed(() => {
  if ((book.value?.availability.availableCopies ?? 0) > 0) {
    return "i-lucide-circle-check-big";
  }

  if ((book.value?.availability.totalCopies ?? 0) > 0) {
    return "i-lucide-clock-3";
  }

  return "i-lucide-circle-minus";
});

const bibliographicDetails = computed(() => [
  { label: "Author", value: book.value?.author },
  { label: "ISBN", value: book.value?.isbn },
  { label: "Category", value: book.value?.category },
  { label: "Call number", value: book.value?.callNumber },
  { label: "Publisher", value: book.value?.publisher },
  { label: "Edition", value: book.value?.edition },
  { label: "Copyright year", value: book.value?.copyrightYear },
]);

async function loadBook() {
  try {
    await collection.loadBook(bookIdentifier.value);
  } catch (error) {
    toast.add({
      title: "Unable to load book details",
      description: collection.detailError.value || useAuth().getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

onMounted(loadBook);

watch(bookIdentifier, (value, previous) => {
  if (value && value !== previous) void loadBook();
});
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <UButton
        to="/student/books"
        label="Back to Book Collection"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        class="self-start"
      />

      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="book"
          :to="{ path: '/student/reservations', query: { book: book.documentId } }"
          label="Reserve This Book"
          icon="i-lucide-bookmark-plus"
          color="primary"
        />
        <UButton
          label="Refresh Details"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="collection.detailLoading.value"
          @click="loadBook"
        />
      </div>
    </div>

    <div
      v-if="collection.detailLoading.value && !book"
      class="grid gap-6 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)]"
    >
      <USkeleton class="aspect-[3/4] w-full rounded-2xl" />
      <div class="space-y-5">
        <USkeleton class="h-8 w-4/5" />
        <USkeleton class="h-5 w-1/2" />
        <USkeleton class="h-28 w-full" />
        <USkeleton class="h-72 w-full" />
      </div>
    </div>

    <UAlert
      v-else-if="collection.detailError.value || !book"
      color="error"
      variant="soft"
      icon="i-lucide-book-x"
      title="Book record unavailable"
      :description="collection.detailError.value || 'The requested book is not available in the Student collection.'"
    >
      <template #actions>
        <UButton
          to="/student/books"
          label="Return to Collection"
          color="error"
          variant="outline"
        />
      </template>
    </UAlert>

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
        <UCard :ui="{ body: 'p-0 sm:p-0' }" class="overflow-hidden">
          <div class="aspect-[3/4] bg-elevated/50 p-6 sm:p-8">
            <img
              v-if="book.cover?.url"
              :src="book.cover.url"
              :alt="book.cover.alternativeText || `Cover of ${book.title}`"
              class="size-full object-contain"
              decoding="async"
            >
            <div
              v-else
              class="flex size-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-default bg-default text-center text-muted"
            >
              <UIcon name="i-lucide-book-open" class="size-14" />
              <p class="text-sm">Cover image not available</p>
            </div>
          </div>
        </UCard>

        <div class="space-y-6">
          <UCard>
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge
                    :label="book.category || 'Uncategorized'"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-tag"
                  />
                  <UBadge
                    :label="book.availability.status"
                    :color="availabilityColor"
                    variant="soft"
                    :icon="availabilityIcon"
                  />
                </div>

                <h1 class="mt-4 text-2xl font-bold leading-tight text-highlighted sm:text-3xl">
                  {{ book.title }}
                </h1>
                <p class="mt-2 text-base text-muted">{{ book.author }}</p>
              </div>
            </div>

            <UAlert
              class="mt-6"
              color="primary"
              variant="soft"
              icon="i-lucide-info"
              title="Availability is updated from physical-copy records"
              description="A book may become unavailable before you reach the Library when another member borrows or reserves its remaining copy."
            />
          </UCard>

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StudentMetricCard
              label="Total Copies"
              :value="book.availability.totalCopies"
              description="Cataloged copies visible to students"
              icon="i-lucide-copy"
              tone="neutral"
            />
            <StudentMetricCard
              label="Available Now"
              :value="book.availability.availableCopies"
              description="Copies ready for borrowing"
              icon="i-lucide-book-check"
              tone="success"
            />
            <StudentMetricCard
              label="Currently Borrowed"
              :value="book.availability.borrowedCopies"
              description="Copies issued to members"
              icon="i-lucide-book-open-check"
              tone="warning"
            />
            <StudentMetricCard
              label="Reserved"
              :value="book.availability.reservedCopies"
              description="Copies held for pickup"
              icon="i-lucide-bookmark-check"
              tone="primary"
            />
          </div>

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <div class="border-b border-default p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UIcon name="i-lucide-library-big" class="size-5" />
                </div>
                <div>
                  <h2 class="font-semibold text-highlighted">Bibliographic Information</h2>
                  <p class="text-xs text-muted">Formal catalog information recorded by the Library.</p>
                </div>
              </div>
            </div>

            <dl class="divide-y divide-default">
              <div
                v-for="item in bibliographicDetails"
                :key="item.label"
                class="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4 sm:px-6"
              >
                <dt class="text-sm text-muted">{{ item.label }}</dt>
                <dd class="text-sm font-medium text-highlighted">
                  {{ item.value || 'Not recorded' }}
                </dd>
              </div>
            </dl>
          </UCard>

          <UCard>
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                <UIcon name="i-lucide-map-pin" class="size-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="font-semibold text-highlighted">Shelf Location</h2>
                <p class="mt-1 text-xs leading-relaxed text-muted">
                  Ask the Librarian for assistance when the listed shelf location cannot be found.
                </p>

                <div v-if="book.availability.shelfLocations.length" class="mt-4 flex flex-wrap gap-2">
                  <UBadge
                    v-for="location in book.availability.shelfLocations"
                    :key="location"
                    :label="location"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-map-pinned"
                  />
                </div>
                <p v-else class="mt-4 text-sm text-muted">No public shelf location is recorded.</p>
              </div>
            </div>
          </UCard>

          <UAlert
            color="neutral"
            variant="soft"
            icon="i-lucide-lock-keyhole"
            title="Protected inventory information"
            description="Control numbers, accession numbers, acquisition prices, copy conditions, and internal remarks are intentionally excluded from the Student Portal."
          />
        </div>
      </div>
    </template>
  </div>
</template>
