<script setup lang="ts">
import type { StudentBookRecord } from "~/composables/useStudentBooks";

const props = defineProps<{
  book: StudentBookRecord;
}>();

const availabilityColor = computed<"success" | "warning" | "neutral">(() => {
  if (props.book.availability.availableCopies > 0) return "success";
  if (props.book.availability.totalCopies > 0) return "warning";
  return "neutral";
});

const availabilityIcon = computed(() => {
  if (props.book.availability.availableCopies > 0) {
    return "i-lucide-circle-check-big";
  }

  if (props.book.availability.totalCopies > 0) {
    return "i-lucide-clock-3";
  }

  return "i-lucide-circle-minus";
});

const detailRoute = computed(() =>
  `/student/books/${encodeURIComponent(props.book.documentId)}`,
);
</script>

<template>
  <UCard
    class="sncbt-card-interactive group h-full overflow-hidden"
    :ui="{ body: 'flex h-full flex-col p-0 sm:p-0' }"
  >
    <NuxtLink
      :to="detailRoute"
      class="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      :aria-label="`View details for ${book.title}`"
    >
      <div class="relative aspect-[4/3] overflow-hidden border-b border-default bg-elevated/50">
        <img
          v-if="book.cover?.url"
          :src="book.cover.url"
          :alt="book.cover.alternativeText || `Cover of ${book.title}`"
          class="size-full object-contain p-5 transition duration-300 group-hover:scale-[1.025]"
          loading="lazy"
          decoding="async"
        >

        <div
          v-else
          class="flex size-full flex-col items-center justify-center gap-3 px-6 text-center text-muted"
        >
          <div class="sncbt-card flex size-16 items-center justify-center">
            <UIcon name="i-lucide-book-open" class="size-8" />
          </div>
          <p class="text-xs">Cover image not available</p>
        </div>

        <UBadge
          :label="book.category || 'Uncategorized'"
          color="neutral"
          variant="solid"
          class="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate shadow-sm"
        />
      </div>

      <div class="flex flex-1 flex-col p-5">
        <div class="flex-1">
          <h2 class="line-clamp-2 text-base font-bold leading-snug text-highlighted">
            {{ book.title }}
          </h2>
          <p class="mt-1.5 line-clamp-1 text-sm text-muted">
            {{ book.author }}
          </p>

          <dl class="mt-4 space-y-2 text-xs">
            <div class="flex items-start justify-between gap-4">
              <dt class="text-muted">ISBN</dt>
              <dd class="max-w-[65%] text-right font-medium text-default">
                {{ book.isbn || 'Not recorded' }}
              </dd>
            </div>
            <div class="flex items-start justify-between gap-4">
              <dt class="text-muted">Call number</dt>
              <dd class="max-w-[65%] text-right font-medium text-default">
                {{ book.callNumber || 'Not recorded' }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="mt-5 border-t border-default pt-4">
          <div class="flex items-center justify-between gap-3">
            <UBadge
              :label="book.availability.status"
              :color="availabilityColor"
              variant="soft"
              :icon="availabilityIcon"
            />
            <span class="text-xs font-medium text-muted">
              {{ book.availability.availableCopies }} of
              {{ book.availability.totalCopies }} available
            </span>
          </div>

          <div class="mt-4 flex items-center justify-between text-sm font-semibold text-primary">
            <span>View book details</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </div>
    </NuxtLink>
  </UCard>
</template>
