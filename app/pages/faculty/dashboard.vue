<script setup lang="ts">
definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Faculty Dashboard",
});

const portal = useFacultyPortal();
const toast = useToast();

const metricCards = computed(() => [
  {
    label: "Books in Department",
    value: portal.dashboard.value.metrics.currentLoans,
    description: "Library books currently issued to your Faculty account.",
    icon: "i-lucide-library-big",
    color: "primary" as const,
  },
  {
    label: "Review Due Soon",
    value: portal.dashboard.value.metrics.reviewDueSoon,
    description: "Books due for return or condition confirmation within 30 days.",
    icon: "i-lucide-calendar-clock",
    color: portal.dashboard.value.metrics.reviewDueSoon ? "warning" as const : "success" as const,
  },
  {
    label: "For Replacement",
    value: portal.dashboard.value.metrics.lostForReplacement,
    description: "Lost books that still require a new replacement copy.",
    icon: "i-lucide-package-plus",
    color: portal.dashboard.value.metrics.lostForReplacement ? "error" as const : "success" as const,
  },
  {
    label: "Open Status Reports",
    value: portal.dashboard.value.metrics.openReports,
    description: "Submitted reports still being reviewed by the Library.",
    icon: "i-lucide-clipboard-clock",
    color: portal.dashboard.value.metrics.openReports ? "warning" as const : "neutral" as const,
  },
]);

const firstName = computed(
  () => portal.dashboard.value.faculty?.firstName || "Faculty",
);

function dateLabel(value: string | null | undefined) {
  if (!value) return "Date not available";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00+08:00`));
}

function statusColor(status: string) {
  if (status === "Lost") return "error" as const;
  if (status === "Overdue") return "warning" as const;
  return "primary" as const;
}

function metricToneClass(value: "primary" | "warning" | "success" | "error" | "neutral") {
  const classes = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    error: "bg-error/10 text-error",
    neutral: "bg-elevated text-muted",
  } as const;
  return classes[value];
}

function noticeToneClass(value: string) {
  if (value === "Critical") return "text-error";
  if (value === "Warning") return "text-warning";
  if (value === "Success") return "text-success";
  return "text-primary";
}

async function load() {
  try {
    await portal.loadDashboard();
  } catch (error) {
    toast.add({
      title: "Faculty dashboard unavailable",
      description: portal.error.value || "Please refresh the page or contact the Library.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

onMounted(load);
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <FacultyPageHeader
      eyebrow="Faculty Library Services"
      :title="`Good day, ${firstName}`"
      description="Review books assigned to your department, update their status when needed, and quickly open the Faculty Library services you use most."
      icon="i-lucide-briefcase-business"
    >
      <template #actions>
        <UButton label="Review Borrowed Books" icon="i-lucide-library-big" to="/faculty/borrowings" color="primary" />
        <UButton label="Browse Collection" icon="i-lucide-search" to="/faculty/books" color="neutral" variant="outline" />
        <UButton label="Refresh" icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="portal.loading.value" @click="load" />
      </template>
    </FacultyPageHeader>

    <div v-if="portal.dashboard.value.faculty" class="sncbt-context-strip">
      <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
        <UIcon name="i-lucide-building-2" class="size-3.5 text-primary" />
        {{ portal.dashboard.value.faculty.department }}
      </span>
      <span class="hidden h-4 w-px bg-default sm:block" aria-hidden="true" />
      <span class="text-xs text-muted">{{ portal.dashboard.value.faculty.employeeNo }}</span>
      <span class="hidden h-4 w-px bg-default sm:block" aria-hidden="true" />
      <span class="text-xs text-muted">{{ portal.dashboard.value.faculty.designation || 'Faculty member' }}</span>
    </div>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="card in metricCards" :key="card.label" :ui="{ root: 'ring-1 ring-default shadow-sm', body: 'p-5' }">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ card.label }}</p>
            <p class="mt-2 text-3xl font-bold text-highlighted">{{ card.value }}</p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-2xl" :class="metricToneClass(card.color)">
            <UIcon :name="card.icon" class="size-5" />
          </div>
        </div>
        <p class="mt-3 text-xs leading-5 text-muted">{{ card.description }}</p>
      </UCard>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <UCard :ui="{ root: 'ring-1 ring-default', header: 'border-b border-default p-5', body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold text-highlighted">Books currently assigned to your department</h2>
              <p class="mt-1 text-xs text-muted">Use the status action when a book is lost, worn, replaced, or ready to return.</p>
            </div>
            <UButton label="View All" to="/faculty/borrowings" color="neutral" variant="outline" size="sm" />
          </div>
        </template>

        <div v-if="portal.loading.value && !portal.dashboard.value.currentLoans.length" class="space-y-3 p-5">
          <USkeleton v-for="item in 3" :key="item" class="h-24 rounded-xl" />
        </div>
        <div v-else-if="portal.dashboard.value.currentLoans.length" class="divide-y divide-default">
          <div v-for="loan in portal.dashboard.value.currentLoans" :key="loan.documentId" class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-semibold text-highlighted">{{ loan.book.title }}</p>
                <UBadge :label="loan.status" :color="statusColor(loan.status)" variant="soft" size="sm" />
              </div>
              <p class="mt-1 truncate text-sm text-muted">{{ loan.book.author }}</p>
              <p class="mt-2 text-xs text-muted">
                {{ loan.copy.controlNumber || loan.copy.accessionNumber || 'Copy number unavailable' }} · Review date {{ dateLabel(loan.dueDate) }}
              </p>
            </div>
            <UButton label="Update Status" icon="i-lucide-clipboard-pen" :to="`/faculty/borrowings?report=${loan.documentId}`" color="primary" variant="soft" size="sm" />
          </div>
        </div>
        <div v-else class="p-10 text-center">
          <UIcon name="i-lucide-library" class="mx-auto size-10 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No books are currently assigned</h3>
          <p class="mt-1 text-sm text-muted">Borrowed Faculty books will appear here after checkout at the Library counter.</p>
        </div>
      </UCard>

      <div class="space-y-6">
        <UCard :ui="{ root: 'ring-1 ring-default', header: 'border-b border-default p-5', body: 'space-y-3 p-5' }">
          <template #header>
            <h2 class="font-semibold text-highlighted">Important account notices</h2>
          </template>
          <div v-for="notice in portal.dashboard.value.notices" :key="notice.code" class="rounded-2xl border border-default bg-elevated/40 p-4">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-info" class="mt-0.5 size-5 shrink-0" :class="noticeToneClass(notice.severity)" />
              <div class="min-w-0">
                <p class="font-medium text-highlighted">{{ notice.title }}</p>
                <p class="mt-1 text-xs leading-5 text-muted">{{ notice.message }}</p>
                <UButton v-if="notice.actionUrl" label="Open" :to="notice.actionUrl" color="neutral" variant="link" class="mt-2 h-auto p-0" />
              </div>
            </div>
          </div>
        </UCard>

        <UCard :ui="{ root: 'ring-1 ring-default', body: 'space-y-4 p-5' }">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <UIcon name="i-lucide-shield-check" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Faculty borrowing policy</h2>
              <p class="text-xs text-muted">Department accountability without monetary fines</p>
            </div>
          </div>
          <ul class="space-y-3 text-sm text-muted">
            <li class="flex gap-2"><UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" /><span>{{ portal.dashboard.value.policy.finePolicy }}</span></li>
            <li class="flex gap-2"><UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" /><span>{{ portal.dashboard.value.policy.replacementPolicy }}</span></li>
            <li class="flex gap-2"><UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" /><span>{{ portal.dashboard.value.policy.loanPeriod }}</span></li>
          </ul>
        </UCard>
      </div>
    </section>
  </div>
</template>
