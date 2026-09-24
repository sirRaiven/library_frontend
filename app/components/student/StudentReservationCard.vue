<script setup lang="ts">
import type { StudentReservationRecord } from "~/composables/useStudentReservations";

const props = defineProps<{
  reservation: StudentReservationRecord;
  cancelling?: boolean;
}>();

const emit = defineEmits<{
  cancel: [reservation: StudentReservationRecord];
}>();

const statusColor = computed<
  "warning" | "info" | "success" | "error" | "neutral"
>(() => {
  const colors = {
    Pending: "warning",
    Approved: "info",
    "Ready for Pickup": "success",
    Completed: "success",
    Cancelled: "neutral",
    Expired: "error",
  } as const;
  return colors[props.reservation.status] ?? "neutral";
});

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00+08:00`));
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }" class="sncbt-card-interactive overflow-hidden">
    <div class="flex gap-4 p-4 sm:gap-5 sm:p-6">
      <div class="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated/50 sm:size-20 sm:rounded-xl">
        <img
          v-if="reservation.book.cover?.url"
          :src="reservation.book.cover.url"
          :alt="reservation.book.cover.alternativeText || `Cover of ${reservation.book.title}`"
          class="size-full object-contain p-2"
          loading="lazy"
        >
        <UIcon v-else name="i-lucide-book-open" class="size-6 text-muted sm:size-8" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :label="reservation.status" :color="statusColor" variant="soft" />
              <UBadge
                v-if="reservation.isExpiringSoon"
                label="Expiring soon"
                color="warning"
                variant="soft"
                icon="i-lucide-timer"
              />
            </div>
            <h2 class="mt-3 line-clamp-2 text-base font-bold text-highlighted">
              {{ reservation.book.title }}
            </h2>
            <p class="mt-1 text-sm text-muted">{{ reservation.book.author }}</p>
          </div>

          <UButton
            v-if="reservation.canCancel"
            label="Cancel Reservation"
            icon="i-lucide-x-circle"
            color="error"
            variant="outline"
            size="sm"
            :loading="cancelling"
            @click="emit('cancel', reservation)"
          />
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-3 text-xs xl:grid-cols-4">
          <div>
            <dt class="text-muted">Reservation number</dt>
            <dd class="mt-1 font-mono font-semibold text-highlighted">
              {{ reservation.reservationNo || 'Pending assignment' }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">Reservation date</dt>
            <dd class="mt-1 font-medium text-highlighted">{{ formatDate(reservation.reservationDate) }}</dd>
          </div>
          <div>
            <dt class="text-muted">Expiration date</dt>
            <dd class="mt-1 font-medium text-highlighted">{{ formatDate(reservation.expirationDate) }}</dd>
          </div>
          <div>
            <dt class="text-muted">Available copies now</dt>
            <dd class="mt-1 font-medium text-highlighted">
              {{ reservation.book.availability.availableCopies }} of {{ reservation.book.availability.totalCopies }}
            </dd>
          </div>
        </dl>

        <UAlert
          v-if="reservation.status === 'Ready for Pickup'"
          class="mt-4"
          color="success"
          variant="soft"
          icon="i-lucide-package-check"
          title="Ready for pickup"
          description="Visit the Library within the approved pickup period and present your Library Card."
        />
      </div>
    </div>
  </UCard>
</template>
