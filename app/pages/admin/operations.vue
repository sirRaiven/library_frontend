<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Library Operations",
});

const operations = useAdminOperations();
const toast = useToast();

const data = computed(() => operations.data.value);

const primaryMetrics = computed(() => [
  {
    label: "Book Copies",
    value: data.value.collection.copies,
    description: `${data.value.collection.available} available · ${data.value.collection.borrowed} borrowed`,
    icon: "i-lucide-library",
    tone: "success" as const,
  },
  {
    label: "Active Borrowings",
    value: data.value.circulation.activeBorrowings,
    description: `${data.value.circulation.overdue} overdue`,
    icon: "i-lucide-book-open-check",
    tone: data.value.circulation.overdue ? "warning" as const : "primary" as const,
  },
  {
    label: "Reservations",
    value:
      data.value.reservations.pending +
      data.value.reservations.approved +
      data.value.reservations.readyForPickup,
    description: `${data.value.reservations.readyForPickup} ready for pickup`,
    icon: "i-lucide-bookmark-check",
    tone: "info" as const,
  },
  {
    label: "Visits Today",
    value: data.value.attendance.today,
    description: `${data.value.attendance.studentsToday} Students · ${data.value.attendance.facultyToday} Faculty`,
    icon: "i-lucide-scan-line",
    tone: "primary" as const,
  },
]);

const attentionItems = computed(() => [
  {
    label: "Overdue Borrowings",
    value: data.value.circulation.overdue,
    icon: "i-lucide-clock-alert",
  },
  {
    label: "Damaged Copies",
    value: data.value.collection.damaged,
    icon: "i-lucide-book-x",
  },
  {
    label: "Lost Copies",
    value: data.value.collection.lost,
    icon: "i-lucide-search-x",
  },
  {
    label: "Pending Reservations",
    value: data.value.reservations.pending,
    icon: "i-lucide-bookmark",
  },
  {
    label: "Pending Memberships",
    value: data.value.membership.pendingMemberships,
    icon: "i-lucide-user-round-clock",
  },
  {
    label: "Pending Registrations",
    value: data.value.membership.pendingRegistrations,
    icon: "i-lucide-clipboard-clock",
  },
  {
    label: "Unpaid Fines",
    value: data.value.fines.unpaid,
    icon: "i-lucide-receipt-text",
  },
  {
    label: "Faculty Reports Needing Attention",
    value:
      data.value.facultyAccountability.needsAttention +
      data.value.facultyAccountability.lostWillReplace +
      data.value.facultyAccountability.replacementSubmitted,
    icon: "i-lucide-briefcase-business",
  },
]);

const collectionRows = computed(() => [
  ["Book Titles", data.value.collection.titles],
  ["Available", data.value.collection.available],
  ["Borrowed", data.value.collection.borrowed],
  ["Reserved", data.value.collection.reserved],
  ["Damaged", data.value.collection.damaged],
  ["Lost", data.value.collection.lost],
  ["Archived", data.value.collection.archived],
]);

const membershipRows = computed(() => [
  ["Active Memberships", data.value.membership.activeMemberships],
  ["Pending Approval", data.value.membership.pendingMemberships],
  ["Expired", data.value.membership.expiredMemberships],
  ["Suspended", data.value.membership.suspendedMemberships],
  ["Active Students", data.value.membership.activeStudents],
  ["Active Faculty", data.value.membership.activeFaculty],
]);

const facultyRows = computed(() => [
  ["Needs Attention", data.value.facultyAccountability.needsAttention],
  ["Lost - Will Replace", data.value.facultyAccountability.lostWillReplace],
  ["Replacement Submitted", data.value.facultyAccountability.replacementSubmitted],
  ["Ready for Library Return", data.value.facultyAccountability.readyForReturn],
  ["Unresolved Reports", data.value.facultyAccountability.unresolvedReports],
]);

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value: string) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function operationIcon(type: string) {
  switch (type) {
    case "Borrowing":
      return "i-lucide-book-open-check";
    case "Return":
      return "i-lucide-undo-2";
    case "Reservation":
      return "i-lucide-bookmark-check";
    case "Fine":
      return "i-lucide-receipt-text";
    case "Visit":
      return "i-lucide-scan-line";
    default:
      return "i-lucide-activity";
  }
}

async function refresh() {
  try {
    await operations.refresh();
  } catch (error) {
    toast.add({
      title: "Unable to load Library Operations",
      description: useAuth().getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

onMounted(refresh);
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      title="Library Operations"
      description="Monitor collection, circulation, memberships, reservations, fines, attendance, and Faculty accountability from a read-only administrative view."
      icon="i-lucide-chart-no-axes-combined"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="operations.loading.value"
          @click="refresh"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      v-if="operations.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Library Operations data could not be loaded"
      :description="operations.error.value"
    />

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        v-for="item in primaryMetrics"
        :key="item.label"
        v-bind="item"
        :loading="operations.loading.value && !data.generatedAt"
      />
    </section>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold text-highlighted">Items Requiring Attention</h2>
            <p class="mt-1 text-xs text-muted">
              Operational conditions that may require Librarian review or follow-up.
            </p>
          </div>
          <p v-if="data.generatedAt" class="text-xs text-muted">
            Updated {{ formatDateTime(data.generatedAt) }}
          </p>
        </div>
      </template>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="item in attentionItems"
          :key="item.label"
          class="rounded-xl border border-default bg-elevated/30 p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <UIcon :name="item.icon" class="size-4" />
            </div>
            <span class="text-2xl font-bold text-highlighted">{{ item.value }}</span>
          </div>
          <p class="mt-3 text-sm font-medium text-default">{{ item.label }}</p>
        </div>
      </div>
    </UCard>

    <div class="grid gap-6 xl:grid-cols-2">
      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Collection Status</h2>
            <p class="mt-1 text-xs text-muted">{{ data.collection.copies }} physical copies across {{ data.collection.titles }} titles.</p>
          </div>
        </template>

        <div class="divide-y divide-default">
          <div
            v-for="[label, value] in collectionRows"
            :key="String(label)"
            class="flex items-center justify-between py-3"
          >
            <span class="text-sm text-muted">{{ label }}</span>
            <span class="text-sm font-semibold text-highlighted">{{ value }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Circulation and Reservations</h2>
            <p class="mt-1 text-xs text-muted">Current circulation workload and today's completed movement.</p>
          </div>
        </template>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Checkouts Today</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.circulation.checkoutsToday }}</p>
          </div>
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Returns Today</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.circulation.returnsToday }}</p>
          </div>
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Approved Reservations</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.reservations.approved }}</p>
          </div>
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Ready for Pickup</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.reservations.readyForPickup }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Membership</h2>
            <p class="mt-1 text-xs text-muted">Student and Faculty participation in the Library system.</p>
          </div>
        </template>

        <div class="divide-y divide-default">
          <div
            v-for="[label, value] in membershipRows"
            :key="String(label)"
            class="flex items-center justify-between py-3"
          >
            <span class="text-sm text-muted">{{ label }}</span>
            <span class="text-sm font-semibold text-highlighted">{{ value }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Fines and Payments</h2>
            <p class="mt-1 text-xs text-muted">Read-only financial accountability summary.</p>
          </div>
        </template>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Unpaid Fines</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.fines.unpaid }}</p>
            <p class="mt-1 text-xs text-warning">{{ formatMoney(data.fines.outstandingAmount) }} outstanding</p>
          </div>
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Recorded Paid Amount</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ formatMoney(data.fines.recordedPaidAmount) }}</p>
            <p class="mt-1 text-xs text-muted">{{ data.fines.paid }} paid · {{ data.fines.waived }} waived</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Faculty Accountability</h2>
            <p class="mt-1 text-xs text-muted">Current Faculty book-report conditions requiring Library awareness.</p>
          </div>
        </template>

        <div class="divide-y divide-default">
          <div
            v-for="[label, value] in facultyRows"
            :key="String(label)"
            class="flex items-center justify-between py-3"
          >
            <span class="text-sm text-muted">{{ label }}</span>
            <span class="text-sm font-semibold text-highlighted">{{ value }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Attendance Today</h2>
            <p class="mt-1 text-xs text-muted">Library entry records for the current Manila calendar day.</p>
          </div>
        </template>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">All Visits</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.attendance.today }}</p>
          </div>
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Students</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.attendance.studentsToday }}</p>
          </div>
          <div class="rounded-xl bg-elevated/40 p-4">
            <p class="text-xs text-muted">Faculty</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ data.attendance.facultyToday }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div>
          <h2 class="font-semibold text-highlighted">Recent Library Activity</h2>
          <p class="mt-1 text-xs text-muted">Latest borrowing, return, reservation, fine, and visit records.</p>
        </div>
      </template>

      <div v-if="operations.loading.value && !data.recentOperations.length" class="space-y-3 p-5">
        <USkeleton v-for="index in 5" :key="index" class="h-14 w-full" />
      </div>

      <div v-else-if="data.recentOperations.length" class="divide-y divide-default">
        <div
          v-for="(item, index) in data.recentOperations"
          :key="`${item.type}-${item.label}-${index}`"
          class="flex items-start gap-3 px-5 py-4"
        >
          <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon :name="operationIcon(item.type)" class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold text-highlighted">{{ item.label }}</p>
              <time class="text-xs text-muted">{{ formatDateTime(item.occurredAt) }}</time>
            </div>
            <p class="mt-1 text-sm text-muted">{{ item.description }}</p>
            <p v-if="item.status" class="mt-1 text-xs text-dimmed">{{ item.status }}</p>
          </div>
        </div>
      </div>

      <div v-else class="p-8 text-center">
        <UIcon name="i-lucide-activity" class="mx-auto size-10 text-dimmed" />
        <p class="mt-3 text-sm font-medium text-highlighted">No Library activity recorded yet</p>
      </div>
    </UCard>
  </div>
</template>
