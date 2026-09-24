<script setup lang="ts">
import LibraryBookCover from "~/components/shared/LibraryBookCover.vue";
const props = defineProps<{
  title: string;
  author: string;
  documentId: string;
  to: string;
  isbn?: string | null;
  category?: string | null;
  callNumber?: string | null;
  cover?: { url: string; alternativeText?: string | null } | null;
  status: string;
  totalCopies: number;
  availableCopies: number;
}>();

const availabilityColor = computed<"success" | "warning" | "neutral">(() => {
  if (props.availableCopies > 0) return "success";
  if (props.totalCopies > 0) return "warning";
  return "neutral";
});

const availabilityIcon = computed(() => {
  if (props.availableCopies > 0) return "i-lucide-circle-check-big";
  if (props.totalCopies > 0) return "i-lucide-clock-3";
  return "i-lucide-circle-minus";
});

const availabilityLabel = computed(() => {
  if (props.availableCopies > 0) {
    return `${props.availableCopies} of ${props.totalCopies} ${props.totalCopies === 1 ? "copy" : "copies"} ready`;
  }

  if (props.totalCopies > 0) return "No copy is available right now";
  return "No physical copy is currently listed";
});
</script>

<template>
  <UCard
    class="group h-full overflow-hidden transition-[border-color,box-shadow] duration-150 hover:border-primary/25 hover:shadow-md motion-reduce:transition-none"
    :ui="{ body: 'h-full p-0 sm:p-0' }"
  >
    <div class="flex h-full flex-col sm:flex-row">
      <NuxtLink
        :to="to"
        class="hidden shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:block"
        :aria-label="`View ${title}`"
      >
        <LibraryBookCover
          :title="title"
          :author="author"
          :call-number="callNumber"
          :category="category"
          :cover-url="cover?.url"
          :cover-alt="cover?.alternativeText"
          class="min-h-full w-40 sm:w-40 rounded-none border-r border-default"
        />
      </NuxtLink>

      <div class="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div class="flex items-start gap-3">
          <NuxtLink
            :to="to"
            class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:hidden"
            :aria-label="`View ${title}`"
          >
            <img
              v-if="cover?.url"
              :src="cover.url"
              :alt="cover.alternativeText || `Cover of ${title}`"
              class="size-full object-cover"
              loading="lazy"
              decoding="async"
            >
            <UIcon v-else name="i-lucide-book-open" class="size-5" />
          </NuxtLink>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <UBadge
                :label="status"
                :color="availabilityColor"
                variant="soft"
                size="sm"
                :icon="availabilityIcon"
              />
              <UBadge
                v-if="category"
                :label="category"
                color="neutral"
                variant="outline"
                size="sm"
                class="max-w-full truncate"
              />
            </div>

            <NuxtLink :to="to" class="mt-2 block focus-visible:outline-none">
              <h2 class="line-clamp-2 text-base font-semibold leading-snug text-highlighted transition-colors hover:text-primary focus-visible:text-primary sm:text-lg">
                {{ title }}
              </h2>
            </NuxtLink>
            <p class="mt-1 line-clamp-1 text-sm text-muted">{{ author }}</p>
          </div>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div class="min-w-0">
            <dt class="text-muted">ISBN</dt>
            <dd class="mt-0.5 truncate font-medium text-highlighted">{{ isbn || 'Not recorded' }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-muted">Call number</dt>
            <dd class="mt-0.5 truncate font-medium text-highlighted">{{ callNumber || 'Not assigned' }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex items-end justify-between gap-3 border-t border-default pt-3">
          <div class="min-w-0">
            <p class="text-[11px] font-medium text-muted">Availability</p>
            <p
              class="mt-0.5 truncate text-sm font-semibold"
              :class="availableCopies > 0 ? 'text-success' : 'text-highlighted'"
            >
              {{ availabilityLabel }}
            </p>
          </div>

          <NuxtLink
            :to="to"
            class="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View details
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </UCard>
</template>
