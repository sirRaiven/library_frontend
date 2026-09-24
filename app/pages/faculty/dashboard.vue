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
  <div class="sncbt-page-shell sncbt-member-page space-y-5 sm:space-y-6">
    <UCard class="sncbt-member-dashboard-hero" :ui="{ body: 'p-5 sm:p-7 lg:p-8' }">
      <div class="relative z-[1] grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:items-center">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge label="Faculty Portal" color="primary" variant="soft" icon="i-lucide-briefcase-business" />
            <span v-if="portal.dashboard.value.faculty" class="text-xs text-muted">
              {{ portal.dashboard.value.faculty.department }}
            </span>
          </div>

          <h1 class="mt-4 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl lg:text-4xl">
            Good day, {{ firstName }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Review department books, submit condition updates, and keep your Faculty Library records current.
          </p>

          <div class="mt-5 flex flex-wrap gap-2">
            <UButton label="Review Borrowed Books" icon="i-lucide-library-big" to="/faculty/borrowings" color="primary" class="hidden lg:inline-flex" />
            <UButton label="Browse Collection" icon="i-lucide-search" to="/faculty/books" color="neutral" variant="outline" class="hidden lg:inline-flex" />
            <UButton label="Refresh" icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="portal.loading.value" @click="load" />
          </div>
        </div>

        <div v-if="portal.dashboard.value.faculty" class="rounded-2xl border border-primary/15 bg-default/75 p-4 shadow-sm sm:p-5">
          <div class="flex items-center gap-4">
            <UAvatar
              :src="portal.dashboard.value.faculty.photoUrl || undefined"
              :alt="portal.dashboard.value.faculty.fullName"
              :text="portal.dashboard.value.faculty.fullName.split(/\s+/).slice(0, 2).map(value => value[0]).join('')"
              size="2xl"
              class="size-16 shrink-0 rounded-2xl ring-4 ring-primary/10"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-lg font-bold text-highlighted">{{ portal.dashboard.value.faculty.fullName }}</h2>
                <UBadge
                  :label="portal.dashboard.value.faculty.status"
                  :color="portal.dashboard.value.faculty.status === 'Active' ? 'success' : 'warning'"
                  variant="soft"
                />
              </div>
              <p class="mt-1 text-sm font-semibold text-primary">{{ portal.dashboard.value.faculty.employeeNo }}</p>
              <p class="mt-1 truncate text-xs text-muted">{{ portal.dashboard.value.faculty.designation || 'Faculty member' }}</p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="rounded-xl border border-default/80 bg-elevated/35 px-3 py-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Department</p>
              <p class="mt-1 truncate text-xs font-semibold text-highlighted">{{ portal.dashboard.value.faculty.department }}</p>
            </div>
            <div class="rounded-xl border border-default/80 bg-elevated/35 px-3 py-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Books Assigned</p>
              <p class="mt-1 text-lg font-bold text-highlighted">{{ portal.dashboard.value.metrics.currentLoans }}</p>
            </div>
          </div>

          <UButton to="/faculty/profile" label="Open My Account" icon="i-lucide-user-round-cog" color="neutral" variant="ghost" size="sm" block class="mt-3" />
        </div>
      </div>
    </UCard>

    <section aria-labelledby="faculty-overview-heading">
      <div class="mb-3">
        <h2 id="faculty-overview-heading" class="text-base font-semibold text-highlighted">Department Library overview</h2>
        <p class="mt-1 text-sm text-muted">A quick view of books, reviews, replacements, and submitted reports.</p>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <UCard v-for="card in metricCards" :key="card.label" :ui="{ root: 'ring-1 ring-default shadow-sm', body: 'p-4 sm:p-5' }">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-bold text-highlighted sm:text-3xl">{{ card.value }}</p>
            </div>
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11 sm:rounded-2xl" :class="metricToneClass(card.color)">
              <UIcon :name="card.icon" class="size-5" />
            </div>
          </div>
          <p class="mt-3 line-clamp-2 text-xs leading-5 text-muted">{{ card.description }}</p>
        </UCard>
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <UCard :ui="{ root: 'ring-1 ring-default', header: 'border-b border-default p-5 sm:p-6', body: 'p-0' }">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Books currently assigned</h2>
              <p class="mt-1 text-xs text-muted">Review due dates and update the condition or status when needed.</p>
            </div>
            <UButton label="View all borrowed books" to="/faculty/borrowings" color="neutral" variant="outline" size="sm" />
          </div>
        </template>

        <div v-if="portal.loading.value && !portal.dashboard.value.currentLoans.length" class="space-y-3 p-5 sm:p-6">
          <USkeleton v-for="item in 3" :key="item" class="h-24 rounded-xl" />
        </div>
        <div v-else-if="portal.dashboard.value.currentLoans.length" class="divide-y divide-default">
          <article
            v-for="loan in portal.dashboard.value.currentLoans.slice(0, 5)"
            :key="loan.documentId"
            class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="line-clamp-2 font-semibold text-highlighted">{{ loan.book.title }}</h3>
                <UBadge :label="loan.status" :color="statusColor(loan.status)" variant="soft" size="sm" />
              </div>
              <p class="mt-1 truncate text-sm text-muted">{{ loan.book.author }}</p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>{{ loan.copy.controlNumber || loan.copy.accessionNumber || 'Copy number unavailable' }}</span>
                <span>Review {{ dateLabel(loan.dueDate) }}</span>
              </div>
            </div>
            <UButton label="Update Status" icon="i-lucide-clipboard-pen" :to="`/faculty/borrowings?report=${loan.documentId}`" color="primary" variant="soft" size="sm" class="shrink-0" />
          </article>
        </div>
        <div v-else class="p-10 text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-success/10 text-success">
            <UIcon name="i-lucide-library" class="size-6" />
          </div>
          <h3 class="mt-3 font-semibold text-highlighted">No books are currently assigned</h3>
          <p class="mt-1 text-sm text-muted">Faculty books will appear here after checkout at the Library counter.</p>
        </div>
      </UCard>

      <div class="space-y-5">
        <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5 sm:p-6' }">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold text-highlighted">Action center</h2>
              <p class="mt-1 text-xs text-muted">Notices and Library tasks that may require attention.</p>
            </div>
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-bell-dot" class="size-5" />
            </div>
          </div>

          <div v-if="portal.dashboard.value.notices.length" class="mt-4 space-y-2.5">
            <div v-for="notice in portal.dashboard.value.notices.slice(0, 4)" :key="notice.code" class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
              <div class="flex items-start gap-3">
                <UIcon name="i-lucide-info" class="mt-0.5 size-4.5 shrink-0" :class="noticeToneClass(notice.severity)" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-highlighted">{{ notice.title }}</p>
                  <p class="mt-1 text-xs leading-5 text-muted">{{ notice.message }}</p>
                  <UButton v-if="notice.actionUrl" label="Open" :to="notice.actionUrl" color="neutral" variant="link" size="xs" class="mt-1 h-auto p-0" />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-4 rounded-xl border border-dashed border-default p-6 text-center">
            <UIcon name="i-lucide-circle-check-big" class="mx-auto size-8 text-success" />
            <p class="mt-2 text-sm font-semibold text-highlighted">No urgent Library concerns</p>
            <p class="mt-1 text-xs text-muted">Your current Faculty Library records do not require action.</p>
          </div>
        </UCard>

        <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5 sm:p-6' }">
          <h2 class="font-semibold text-highlighted">Quick access</h2>
          <p class="mt-1 text-xs text-muted">Open the Faculty Library service you use most.</p>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <UButton to="/faculty/books" label="Books" icon="i-lucide-book-open" color="neutral" variant="soft" class="justify-start" />
            <UButton to="/faculty/borrowings" label="Borrowed" icon="i-lucide-library-big" color="neutral" variant="soft" class="justify-start" />
            <UButton to="/faculty/reports" label="Reports" icon="i-lucide-clipboard-check" color="neutral" variant="soft" class="justify-start" />
            <UButton to="/faculty/profile" label="My Account" icon="i-lucide-user-round-cog" color="neutral" variant="soft" class="justify-start" />
          </div>
        </UCard>
      </div>
    </section>

    <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5 sm:p-6' }">
      <div class="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <UIcon name="i-lucide-shield-check" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">Faculty borrowing policy</h2>
            <p class="text-xs text-muted">Department accountability without monetary fines.</p>
          </div>
        </div>
        <ul class="grid gap-3 text-sm text-muted md:grid-cols-3">
          <li class="flex gap-2 rounded-xl border border-default/80 bg-elevated/25 p-3"><UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" /><span>{{ portal.dashboard.value.policy.finePolicy }}</span></li>
          <li class="flex gap-2 rounded-xl border border-default/80 bg-elevated/25 p-3"><UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" /><span>{{ portal.dashboard.value.policy.replacementPolicy }}</span></li>
          <li class="flex gap-2 rounded-xl border border-default/80 bg-elevated/25 p-3"><UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" /><span>{{ portal.dashboard.value.policy.loanPeriod }}</span></li>
        </ul>
      </div>
    </UCard>
  </div>
</template>
