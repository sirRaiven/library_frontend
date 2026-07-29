<script setup lang="ts">
import type { StudentBorrowingRecord } from "~/composables/useStudentBorrowings";

const props = defineProps<{
  borrowing: StudentBorrowingRecord;
}>();

const config = useRuntimeConfig();
const strapiUrl = String(config.public.strapiUrl).replace(/\/$/, "");

function mediaUrl(url?: string | null) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `${strapiUrl}${url}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

const active = computed(() =>
  ["Borrowed", "Overdue"].includes(props.borrowing.status),
);

const statusColor = computed(() => {
  if (props.borrowing.isOverdue || props.borrowing.status === "Lost") {
    return "error" as const;
  }

  if (props.borrowing.isDueSoon) return "warning" as const;
  if (props.borrowing.status === "Returned") return "success" as const;
  if (props.borrowing.status === "Cancelled") return "neutral" as const;
  return "primary" as const;
});

const timingLabel = computed(() => {
  if (!active.value) return props.borrowing.status;
  if (props.borrowing.isOverdue) {
    return `${props.borrowing.overdueDays} day${props.borrowing.overdueDays === 1 ? "" : "s"} overdue`;
  }
  if (props.borrowing.daysRemaining === 0) return "Due today";
  if (props.borrowing.daysRemaining === 1) return "Due tomorrow";
  if (props.borrowing.daysRemaining !== null) {
    return `${props.borrowing.daysRemaining} days remaining`;
  }
  return props.borrowing.status;
});
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <article class="p-5 sm:p-6">
      <div class="flex flex-col gap-5 sm:flex-row">
        <div class="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-default bg-elevated sm:size-32">
          <img
            v-if="borrowing.book.cover?.url"
            :src="mediaUrl(borrowing.book.cover.url)"
            :alt="borrowing.book.cover.alternativeText || borrowing.book.title"
            class="size-full object-cover"
            loading="lazy"
            decoding="async"
          >
          <UIcon v-else name="i-lucide-book-open" class="size-10 text-dimmed" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {{ borrowing.borrowNo || 'Borrowing record' }}
              </p>
              <h2 class="mt-1 line-clamp-2 text-lg font-bold text-highlighted">
                {{ borrowing.book.title }}
              </h2>
              <p class="mt-1 text-sm text-muted">{{ borrowing.book.author }}</p>
            </div>

            <div class="flex flex-wrap gap-2 lg:justify-end">
              <UBadge
                :label="borrowing.status"
                :color="statusColor"
                variant="soft"
              />
              <UBadge
                v-if="active"
                :label="timingLabel"
                :color="statusColor"
                variant="subtle"
              />
            </div>
          </div>

          <dl class="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <dt class="text-xs text-muted">Borrowed on</dt>
              <dd class="mt-1 font-medium text-highlighted">{{ formatDateTime(borrowing.borrowDate) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Due date</dt>
              <dd class="mt-1 font-medium" :class="borrowing.isOverdue ? 'text-error' : 'text-highlighted'">
                {{ formatDate(borrowing.dueDate) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">ISBN</dt>
              <dd class="mt-1 font-medium text-highlighted">{{ borrowing.book.isbn || 'Not available' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Control number</dt>
              <dd class="mt-1 font-mono text-xs font-semibold text-highlighted">
                {{ borrowing.copy.controlNumber || 'Not available' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Accession number</dt>
              <dd class="mt-1 font-mono text-xs font-semibold text-highlighted">
                {{ borrowing.copy.accessionNumber || 'Not available' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Shelf location</dt>
              <dd class="mt-1 font-medium text-highlighted">{{ borrowing.copy.shelfLocation || 'Not available' }}</dd>
            </div>
          </dl>

          <div
            v-if="borrowing.return"
            class="mt-5 rounded-xl border border-default bg-elevated/45 p-4"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-rotate-ccw" class="size-4 text-success" />
              <h3 class="text-sm font-semibold text-highlighted">Return record</h3>
            </div>

            <dl class="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt class="text-xs text-muted">Return number</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ borrowing.return.returnNo || 'Not available' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Returned on</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ formatDateTime(borrowing.return.returnDate) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Condition</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ borrowing.return.condition || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Recorded fine</dt>
                <dd class="mt-1 font-semibold" :class="borrowing.return.fineAmount > 0 ? 'text-warning' : 'text-highlighted'">
                  {{ formatCurrency(borrowing.return.fineAmount) }}
                </dd>
              </div>
            </dl>
          </div>

          <UAlert
            v-if="borrowing.isOverdue"
            class="mt-5"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="This book is overdue"
            description="Please return the physical book to the Library counter as soon as possible."
          />
        </div>
      </div>
    </article>
  </UCard>
</template>
