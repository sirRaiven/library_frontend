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
    class="group h-full overflow-hidden transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-neutral-950/5 motion-reduce:transform-none dark:hover:shadow-black/20"
    :ui="{ body: 'h-full p-0 sm:p-0' }"
  >
    <div class="flex h-full flex-col gap-0 sm:flex-row">
      <NuxtLink
        :to="to"
        class="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :aria-label="`View ${title}`"
      >
        <LibraryBookCover
          :title="title"
          :author="author"
          :call-number="callNumber"
          :category="category"
          :cover-url="cover?.url"
          :cover-alt="cover?.alternativeText"
          class="min-h-48 w-full rounded-none border-b border-default sm:min-h-full sm:w-40 sm:rounded-l-2xl sm:rounded-r-none sm:border-b-0 sm:border-r"
        />
      </NuxtLink>

      <div class="flex min-w-0 flex-1 flex-col p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
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

            <NuxtLink
              :to="to"
              class="mt-3 block focus-visible:outline-none"
            >
              <h2 class="line-clamp-2 text-lg font-semibold leading-snug text-highlighted transition-colors hover:text-primary focus-visible:text-primary">
                {{ title }}
              </h2>
            </NuxtLink>
            <p class="mt-1 line-clamp-1 text-sm text-muted">{{ author }}</p>
          </div>
        </div>

        <dl class="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
          <div class="min-w-0">
            <dt class="text-muted">ISBN</dt>
            <dd class="mt-1 truncate font-medium text-highlighted">{{ isbn || 'Not recorded' }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-muted">Call number</dt>
            <dd class="mt-1 truncate font-medium text-highlighted">{{ callNumber || 'Not assigned' }}</dd>
          </div>
        </dl>

        <div class="mt-auto border-t border-default pt-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-xs font-medium text-muted">Availability</p>
              <p
                class="mt-1 text-sm font-semibold"
                :class="availableCopies > 0 ? 'text-success' : 'text-highlighted'"
              >
                {{ availabilityLabel }}
              </p>
            </div>

            <NuxtLink
              :to="to"
              class="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:self-auto"
            >
              View details
              <UIcon name="i-lucide-arrow-right" class="size-4 transition-transform group-hover:translate-x-0.5" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
