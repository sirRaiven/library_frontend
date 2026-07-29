<script setup lang="ts">
definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "Student Dashboard",
  roleTitle: "Student",
});

const dashboard = useStudentDashboard();
const monitoring = useStudentSession();
const toast = useToast();
const config = useRuntimeConfig();

const strapiUrl = String(config.public.strapiUrl).replace(/\/$/, "");

const metricCards = computed(() => [
  {
    label: "Currently Borrowed",
    value: dashboard.metrics.value.currentLoans,
    description: "Physical books currently issued to your account.",
    icon: "i-lucide-book-open-check",
    tone: dashboard.metrics.value.currentLoans ? "primary" as const : "neutral" as const,
  },
  {
    label: "Overdue Books",
    value: dashboard.metrics.value.overdueLoans,
    description: dashboard.metrics.value.overdueLoans
      ? "Please return these books to the Library as soon as possible."
      : "No overdue books are recorded on your account.",
    icon: "i-lucide-calendar-clock",
    tone: dashboard.metrics.value.overdueLoans ? "error" as const : "success" as const,
  },
  {
    label: "Active Reservations",
    value: dashboard.metrics.value.activeReservations,
    description: "Pending, approved, or ready-for-pickup reservations.",
    icon: "i-lucide-bookmark-check",
    tone: dashboard.metrics.value.activeReservations ? "primary" as const : "neutral" as const,
  },
  {
    label: "Due Within 3 Days",
    value: dashboard.metrics.value.dueSoonLoans,
    description: dashboard.metrics.value.dueSoonLoans
      ? "Plan to return these books before their due dates."
      : "No borrowed books are due within the next three days.",
    icon: "i-lucide-alarm-clock",
    tone: dashboard.metrics.value.dueSoonLoans ? "warning" as const : "neutral" as const,
  },
]);

const programLine = computed(() => {
  const student = dashboard.student.value;
  if (!student) return "Student information is loading";

  return [
    student.course,
    student.yearLevel ? `Year ${student.yearLevel}` : null,
    student.section,
  ].filter(Boolean).join(" · ");
});

function mediaUrl(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${strapiUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00+08:00`));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function dueLabel(days: number | null, overdue: boolean) {
  if (days === null) return "Due date unavailable";
  if (overdue) {
    const amount = Math.abs(days);
    return `${amount} day${amount === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

function noticeColor(severity: string) {
  const colors = {
    Info: "info",
    Success: "success",
    Warning: "warning",
    Critical: "error",
  } as const;

  return colors[severity as keyof typeof colors] ?? "neutral";
}

function noticeIcon(severity: string) {
  const icons: Record<string, string> = {
    Info: "i-lucide-info",
    Success: "i-lucide-circle-check",
    Warning: "i-lucide-triangle-alert",
    Critical: "i-lucide-circle-alert",
  };

  return icons[severity] ?? "i-lucide-bell";
}

async function refresh() {
  try {
    await dashboard.refresh();
  } catch (error) {
    toast.add({
      title: "Unable to load your Student Portal",
      description: useAuth().getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

onMounted(refresh);
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <StudentPageHeader
      eyebrow="Student Library Services"
      :title="dashboard.student.value ? `Welcome, ${dashboard.student.value.firstName}` : 'Welcome to your Student Portal'"
      description="Review your Library membership, borrowed books, reservations, and account notices from one secure personal workspace."
      icon="i-lucide-graduation-cap"
    >
      <template #actions>
        <UButton
          to="/student/books"
          label="Browse Books"
          icon="i-lucide-book-open"
          color="primary"
        />
        <UButton
          to="/student/library-card"
          label="Library Card"
          icon="i-lucide-id-card"
          color="neutral"
          variant="outline"
        />
        <UButton
          to="/student/borrowings"
          label="My Borrowed Books"
          icon="i-lucide-book-open-check"
          color="neutral"
          variant="outline"
        />
        <UButton
          to="/student/reservations"
          label="My Reservations"
          icon="i-lucide-bookmark-check"
          color="neutral"
          variant="outline"
        />
        <UButton
          to="/student/notifications"
          label="Notifications"
          icon="i-lucide-bell"
          color="neutral"
          variant="outline"
        />
        <UButton
          to="/student/security"
          label="Profile and Security"
          icon="i-lucide-shield-user"
          color="neutral"
          variant="outline"
        />
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="dashboard.loading.value"
          @click="refresh"
        />
      </template>
    </StudentPageHeader>

    <UAlert
      v-if="dashboard.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Student records could not be loaded"
      :description="dashboard.error.value"
    />

    <UCard :ui="{ body: 'p-5 sm:p-6' }">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
        <USkeleton
          v-if="dashboard.loading.value && !dashboard.student.value"
          class="size-20 shrink-0 rounded-2xl"
        />
        <UAvatar
          v-else
          :src="mediaUrl(dashboard.student.value?.photoUrl ?? null) || undefined"
          :alt="dashboard.student.value?.fullName || 'Student'"
          :text="dashboard.student.value?.fullName?.split(/\s+/).slice(0, 2).map(part => part[0]).join('') || 'S'"
          size="3xl"
          class="size-20 shrink-0 rounded-2xl ring-4 ring-primary/10"
        />

        <div class="min-w-0 flex-1">
          <USkeleton
            v-if="dashboard.loading.value && !dashboard.student.value"
            class="h-7 w-64"
          />
          <h2 v-else class="truncate text-xl font-bold text-highlighted sm:text-2xl">
            {{ dashboard.student.value?.fullName || 'Student profile' }}
          </h2>
          <p class="mt-1 text-sm font-medium text-primary">
            {{ dashboard.student.value?.studentNo || 'Student number unavailable' }}
          </p>
          <p class="mt-1 text-sm text-muted">{{ programLine }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:justify-end">
          <StudentStatusBadge :status="dashboard.student.value?.studentStatus || 'Checking'" />
          <StudentStatusBadge :status="dashboard.membership.value.status" />
        </div>
      </div>
    </UCard>

    <section aria-labelledby="student-account-overview">
      <div class="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 id="student-account-overview" class="text-base font-semibold text-highlighted">
            My Library Overview
          </h2>
          <p class="mt-1 text-xs text-muted">
            These figures are calculated only from records linked to your authenticated Student account.
          </p>
        </div>
        <p v-if="dashboard.data.value.generatedAt" class="hidden text-xs text-muted md:block">
          Updated {{ formatDateTime(dashboard.data.value.generatedAt) }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetricCard
          v-for="item in metricCards"
          :key="item.label"
          v-bind="item"
          :loading="dashboard.loading.value && !dashboard.data.value.generatedAt"
        />
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-id-card" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Membership and Library Card</h2>
              <p class="text-xs text-muted">Your current eligibility and permanent Library Card record.</p>
            </div>
          </div>
        </div>

        <div class="divide-y divide-default">
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Membership status</span>
            <StudentStatusBadge :status="dashboard.membership.value.status" />
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Academic term</span>
            <span class="text-right text-sm font-medium text-highlighted">
              {{ [dashboard.membership.value.academicYear, dashboard.membership.value.semester].filter(Boolean).join(' · ') || 'Not available' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Membership expiry</span>
            <span class="text-right text-sm font-medium text-highlighted">
              {{ formatDate(dashboard.membership.value.expiryDate) }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Enrollment verified</span>
            <UBadge
              :label="dashboard.membership.value.enrollmentVerified ? 'Verified' : 'Not verified'"
              :color="dashboard.membership.value.enrollmentVerified ? 'success' : 'warning'"
              variant="soft"
            />
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Library Card number</span>
            <span class="text-right font-mono text-sm font-semibold text-highlighted">
              {{ dashboard.student.value?.libraryCardNo || 'Not assigned' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Library Card status</span>
            <StudentStatusBadge :status="dashboard.student.value?.libraryCardStatus || 'Checking'" />
          </div>
        </div>

        <div class="border-t border-default p-4 sm:px-6">
          <UButton
            to="/student/library-card"
            label="Open Digital Library Card"
            icon="i-lucide-id-card"
            color="primary"
            variant="soft"
            block
          />
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <UIcon name="i-lucide-bell-ring" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Account Notices</h2>
              <p class="text-xs text-muted">Important reminders generated from your own Library records.</p>
            </div>
          </div>
          <UBadge
            :label="String(dashboard.notices.value.length)"
            color="neutral"
            variant="soft"
          />
        </div>

        <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="space-y-3 p-5 sm:p-6">
          <USkeleton v-for="index in 3" :key="index" class="h-20 w-full" />
        </div>

        <div v-else-if="dashboard.notices.value.length" class="space-y-3 p-5 sm:p-6">
          <UAlert
            v-for="notice in dashboard.notices.value"
            :key="notice.code"
            :color="noticeColor(notice.severity)"
            variant="soft"
            :icon="noticeIcon(notice.severity)"
            :title="notice.title"
            :description="notice.message"
          />
        </div>

        <div v-else class="p-8 text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <UIcon name="i-lucide-circle-check-big" class="size-6" />
          </div>
          <p class="mt-3 text-sm font-semibold text-highlighted">No account notices requiring attention</p>
          <p class="mt-1 text-xs text-muted">Your current Library records do not show an urgent issue.</p>
        </div>
      </UCard>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between gap-4 border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-book-open-check" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Currently Borrowed Books</h2>
              <p class="text-xs text-muted">Books still issued to your Student account.</p>
            </div>
          </div>
          <UButton
            to="/student/borrowings"
            label="View All"
            icon="i-lucide-arrow-right"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </div>

        <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="space-y-4 p-5 sm:p-6">
          <USkeleton v-for="index in 3" :key="index" class="h-24 w-full" />
        </div>

        <div v-else-if="dashboard.currentLoans.value.length" class="divide-y divide-default">
          <article
            v-for="loan in dashboard.currentLoans.value"
            :key="loan.documentId"
            class="p-5 sm:p-6"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="line-clamp-2 text-sm font-semibold text-highlighted">{{ loan.book.title }}</h3>
                <p class="mt-1 text-xs text-muted">{{ loan.book.author }}</p>
              </div>
              <UBadge
                :label="dueLabel(loan.daysRemaining, loan.isOverdue)"
                :color="loan.isOverdue ? 'error' : loan.daysRemaining !== null && loan.daysRemaining <= 3 ? 'warning' : 'neutral'"
                variant="soft"
                class="shrink-0"
              />
            </div>
            <div class="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2">
              <p><span class="font-medium text-default">Due:</span> {{ formatDate(loan.dueDate) }}</p>
              <p><span class="font-medium text-default">Control no.:</span> {{ loan.copy.controlNumber || 'Not available' }}</p>
              <p><span class="font-medium text-default">Accession no.:</span> {{ loan.copy.accessionNumber || 'Not available' }}</p>
              <p><span class="font-medium text-default">Shelf:</span> {{ loan.copy.shelfLocation || 'Not available' }}</p>
            </div>
          </article>
        </div>

        <div v-else class="p-8 text-center">
          <UIcon name="i-lucide-book-check" class="mx-auto size-10 text-dimmed" />
          <p class="mt-3 text-sm font-medium text-highlighted">No books are currently borrowed</p>
          <p class="mt-1 text-xs text-muted">New borrowing transactions will appear here automatically.</p>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <UIcon name="i-lucide-bookmark-check" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Active Reservations</h2>
              <p class="text-xs text-muted">Pending, approved, and ready-for-pickup requests.</p>
            </div>
          </div>
        </div>

        <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="space-y-4 p-5 sm:p-6">
          <USkeleton v-for="index in 3" :key="index" class="h-24 w-full" />
        </div>

        <div v-else-if="dashboard.activeReservations.value.length" class="divide-y divide-default">
          <article
            v-for="reservation in dashboard.activeReservations.value"
            :key="reservation.documentId"
            class="p-5 sm:p-6"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="line-clamp-2 text-sm font-semibold text-highlighted">{{ reservation.book.title }}</h3>
                <p class="mt-1 text-xs text-muted">{{ reservation.book.author }}</p>
              </div>
              <StudentStatusBadge :status="reservation.status" />
            </div>
            <div class="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2">
              <p><span class="font-medium text-default">Reservation no.:</span> {{ reservation.reservationNo || 'Not available' }}</p>
              <p><span class="font-medium text-default">Expires:</span> {{ formatDate(reservation.expirationDate) }}</p>
            </div>
          </article>
        </div>

        <div v-else class="p-8 text-center">
          <UIcon name="i-lucide-bookmark" class="mx-auto size-10 text-dimmed" />
          <p class="mt-3 text-sm font-medium text-highlighted">No active reservations</p>
          <p class="mt-1 text-xs text-muted">Your future reservation requests will be listed here.</p>
        </div>
      </UCard>
    </div>

    <UCard :ui="{ body: 'p-5 sm:p-6' }">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <UIcon name="i-lucide-shield-check" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">Secure Student Session</h2>
            <p class="mt-1 max-w-3xl text-xs leading-5 text-muted">
              The system records sign-in time, session activity, browser type, operating system, application mode, and a random Library System device identifier. It does not collect hardware serial numbers, personal files, webcam images, microphone recordings, or activity outside this Library System.
            </p>
          </div>
        </div>

        <div class="grid shrink-0 gap-2 text-xs sm:grid-cols-2 lg:min-w-[28rem]">
          <div class="rounded-xl border border-default bg-elevated/40 px-4 py-3">
            <p class="text-muted">Current device</p>
            <p class="mt-1 font-semibold text-highlighted">
              {{ monitoring.device.value?.displayName || (monitoring.starting.value ? 'Registering device…' : 'Not registered') }}
            </p>
          </div>
          <div class="rounded-xl border border-default bg-elevated/40 px-4 py-3">
            <p class="text-muted">Session started</p>
            <p class="mt-1 font-semibold text-highlighted">
              {{ formatDateTime(monitoring.data.value?.loginAt) }}
            </p>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
