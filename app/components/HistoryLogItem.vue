<script setup lang="ts">
import type { PortalHistoryEntry } from "~/composables/usePortalHistory";

const props = withDefaults(
  defineProps<{
    entry: PortalHistoryEntry;
    showMember?: boolean;
    showActor?: boolean;
    linkMemberRecord?: boolean;
  }>(),
  {
    showMember: true,
    showActor: false,
    linkMemberRecord: false,
  },
);

const categoryPresentation = {
  borrowing: {
    label: "Borrowing",
    icon: "i-lucide-book-up",
    color: "primary" as const,
    iconClass: "bg-primary/10 text-primary",
  },
  return: {
    label: "Return",
    icon: "i-lucide-book-down",
    color: "success" as const,
    iconClass: "bg-success/10 text-success",
  },
  reservation: {
    label: "Reservation",
    icon: "i-lucide-bookmark-check",
    color: "info" as const,
    iconClass: "bg-info/10 text-info",
  },
  fine: {
    label: "Fine",
    icon: "i-lucide-receipt-text",
    color: "warning" as const,
    iconClass: "bg-warning/10 text-warning",
  },
  visit: {
    label: "Library Visit",
    icon: "i-lucide-scan-line",
    color: "neutral" as const,
    iconClass: "bg-elevated text-muted",
  },
  account: {
    label: "Account",
    icon: "i-lucide-shield-user",
    color: "neutral" as const,
    iconClass: "bg-elevated text-muted",
  },
};

const presentation = computed(() => categoryPresentation[props.entry.category]);

const statusColor = computed(() => {
  const value = props.entry.status.toLowerCase();

  if (
    value.includes("success") ||
    value.includes("returned") ||
    value.includes("paid") ||
    value.includes("approved") ||
    value.includes("completed") ||
    value.includes("good") ||
    value.includes("recorded")
  ) {
    return "success" as const;
  }

  if (
    value.includes("overdue") ||
    value.includes("unpaid") ||
    value.includes("pending") ||
    value.includes("ready") ||
    value.includes("damaged")
  ) {
    return "warning" as const;
  }

  if (
    value.includes("failure") ||
    value.includes("denied") ||
    value.includes("cancelled") ||
    value.includes("lost")
  ) {
    return "error" as const;
  }

  return "neutral" as const;
});

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0);
}
</script>

<template>
  <UCard
    class="sncbt-card-interactive overflow-hidden"
    :ui="{ body: 'p-4 sm:p-5' }"
  >
    <div class="flex gap-4">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-xl"
        :class="presentation.iconClass"
      >
        <UIcon :name="presentation.icon" class="size-5" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold text-highlighted">
                {{ entry.title }}
              </h3>
              <UBadge
                :label="presentation.label"
                :color="presentation.color"
                variant="subtle"
                size="sm"
              />
              <UBadge
                :label="entry.status"
                :color="statusColor"
                variant="soft"
                size="sm"
              />
            </div>

            <p class="mt-1 text-sm leading-relaxed text-muted">
              {{ entry.description }}
            </p>
          </div>

          <time
            :datetime="entry.occurredAt"
            class="shrink-0 text-xs font-medium text-muted"
          >
            {{ formatDateTime(entry.occurredAt) }}
          </time>
        </div>

        <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-default pt-3 text-xs text-muted">
          <span v-if="entry.reference" class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-hash" class="size-3.5" />
            {{ entry.reference }}
          </span>

          <NuxtLink
            v-if="
              showMember &&
              linkMemberRecord &&
              entry.member?.type === 'Student' &&
              entry.member.documentId
            "
            :to="`/librarian/students/${encodeURIComponent(entry.member.documentId)}/record`"
            class="inline-flex items-center gap-1.5 rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            :aria-label="`View Student Record for ${entry.member.name}`"
          >
            <UIcon name="i-lucide-user-round" class="size-3.5" aria-hidden="true" />
            {{ entry.member.name }}
            <span v-if="entry.member.identifier">({{ entry.member.identifier }})</span>
          </NuxtLink>

          <span
            v-else-if="showMember && entry.member"
            class="inline-flex items-center gap-1.5"
          >
            <UIcon name="i-lucide-user-round" class="size-3.5" aria-hidden="true" />
            {{ entry.member.name }}
            <span v-if="entry.member.identifier">({{ entry.member.identifier }})</span>
          </span>

          <span v-if="entry.book" class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-book-open" class="size-3.5" />
            {{ entry.book.title }}
            <span v-if="entry.book.controlNumber">— {{ entry.book.controlNumber }}</span>
          </span>

          <span
            v-if="entry.amount !== null && entry.amount > 0"
            class="inline-flex items-center gap-1.5 font-semibold text-highlighted"
          >
            <UIcon name="i-lucide-philippine-peso" class="size-3.5" />
            {{ formatCurrency(entry.amount) }}
          </span>

          <span
            v-if="showActor && entry.actor"
            class="inline-flex items-center gap-1.5"
          >
            <UIcon name="i-lucide-user-cog" class="size-3.5" />
            Processed by {{ entry.actor }}
          </span>
        </div>
      </div>
    </div>
  </UCard>
</template>
