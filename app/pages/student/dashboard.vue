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

const quickActions = [
  {
    label: "Browse the Collection",
    description: "Search available books by title, author, ISBN, or category.",
    icon: "i-lucide-search",
    to: "/student/books",
    color: "primary" as const,
  },
  {
    label: "My Borrowed Books",
    description: "Review due dates, overdue items, and borrowing history.",
    icon: "i-lucide-book-open-check",
    to: "/student/borrowings",
    color: "neutral" as const,
  },
  {
    label: "My Reservations",
    description: "Track pending requests and books ready for pickup.",
    icon: "i-lucide-bookmark-check",
    to: "/student/reservations",
    color: "neutral" as const,
  },
  {
    label: "Digital Library Card",
    description: "Open your official card and current membership record.",
    icon: "i-lucide-id-card",
    to: "/student/library-card",
    color: "neutral" as const,
  },
  {
    label: "Notifications",
    description: "Read reminders, announcements, and Library updates.",
    icon: "i-lucide-bell",
    to: "/student/notifications",
    color: "neutral" as const,
  },
  {
    label: "Profile and Security",
    description: "Update contact details and review account sessions.",
    icon: "i-lucide-shield-user",
    to: "/student/security",
    color: "neutral" as const,
  },
];

const firstName = computed(() =>
  dashboard.student.value?.firstName?.trim() || "Student",
);

const visibleNotices = computed(() =>
  dashboard.notices.value.slice(0, 3),
);

const hiddenNoticeCount = computed(() =>
  Math.max(0, dashboard.notices.value.length - visibleNotices.value.length),
);

const nextDueLoan = computed(() => {
  const loans = [...dashboard.currentLoans.value]
    .filter(loan => loan.daysRemaining !== null)
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));

  return loans[0] ?? null;
});

const readyReservations = computed(() =>
  dashboard.activeReservations.value.filter(
    reservation =>
      String(reservation.status).trim().toLowerCase() === "ready for pickup",
  ),
);

const attentionItems = computed(() => {
  const items: Array<{
    key: string;
    title: string;
    description: string;
    icon: string;
    color: "error" | "warning" | "info" | "success";
    to?: string;
    action?: string;
  }> = [];

  if (dashboard.metrics.value.overdueLoans > 0) {
    items.push({
      key: "overdue",
      title: `${dashboard.metrics.value.overdueLoans} overdue ${
        dashboard.metrics.value.overdueLoans === 1 ? "book" : "books"
      }`,
      description: "Return overdue items to the Library as soon as possible.",
      icon: "i-lucide-triangle-alert",
      color: "error",
      to: "/student/borrowings",
      action: "Review overdue books",
    });
  } else if (dashboard.metrics.value.dueSoonLoans > 0) {
    items.push({
      key: "due-soon",
      title: `${dashboard.metrics.value.dueSoonLoans} ${
        dashboard.metrics.value.dueSoonLoans === 1 ? "book is" : "books are"
      } due soon`,
      description: "Check the due dates and plan your return before penalties apply.",
      icon: "i-lucide-calendar-clock",
      color: "warning",
      to: "/student/borrowings",
      action: "View due dates",
    });
  }

  if (readyReservations.value.length > 0) {
    items.push({
      key: "pickup",
      title: `${readyReservations.value.length} ${
        readyReservations.value.length === 1 ? "reservation is" : "reservations are"
      } ready for pickup`,
      description: "Bring your Library Card and claim the reserved book within the pickup period.",
      icon: "i-lucide-package-check",
      color: "success",
      to: "/student/reservations",
      action: "View pickup details",
    });
  }

  if (!dashboard.membership.value.enrollmentVerified) {
    items.push({
      key: "verification",
      title: "Enrollment verification is pending",
      description: "Visit the Library counter with your current proof of enrollment.",
      icon: "i-lucide-badge-alert",
      color: "warning",
      to: "/student/library-card",
      action: "Review membership",
    });
  } else if (
    String(dashboard.membership.value.status).trim().toLowerCase() !== "active"
  ) {
    items.push({
      key: "membership",
      title: "Library membership needs attention",
      description: "Review your membership status and renewal requirements.",
      icon: "i-lucide-id-card",
      color: "warning",
      to: "/student/library-card",
      action: "Review membership",
    });
  }

  if (!items.length && !dashboard.loading.value) {
    items.push({
      key: "all-clear",
      title: "Your Library account is in good standing",
      description: "There are no overdue books or urgent membership concerns.",
      icon: "i-lucide-circle-check-big",
      color: "success",
    });
  }

  return items.slice(0, 3);
});

const accountReady = computed(() =>
  String(dashboard.student.value?.studentStatus ?? "").toLowerCase() === "active"
  && String(dashboard.membership.value.status ?? "").toLowerCase() === "active"
  && dashboard.membership.value.enrollmentVerified,
);


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
  <div class="sncbt-page-shell space-y-6">
    <StudentPageHeader
      eyebrow="Student Library Services"
      :title="dashboard.student.value ? `Welcome back, ${firstName}` : 'Welcome to your Student Portal'"
      description="Your personal Library workspace for books, reservations, membership, and account updates."
      icon="i-lucide-graduation-cap"
    >
      <template #actions>
        <UButton
          to="/student/books"
          label="Browse Books"
          icon="i-lucide-search"
          color="primary"
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

    <div
      v-if="dashboard.error.value"
      class="rounded-2xl border border-error/30 bg-error/5 p-4 sm:p-5"
      role="alert"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex min-w-0 gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <UIcon name="i-lucide-circle-alert" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-error">Student records could not be loaded</h2>
            <p class="mt-1 break-words text-sm text-muted">{{ dashboard.error.value }}</p>
          </div>
        </div>
        <UButton
          label="Try Again"
          icon="i-lucide-refresh-cw"
          color="error"
          variant="soft"
          :loading="dashboard.loading.value"
          class="shrink-0"
          @click="refresh"
        />
      </div>
    </div>

    <UCard :ui="{ body: 'p-5 sm:p-6' }">
      <div class="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
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
            <div class="flex flex-wrap items-center gap-2">
              <USkeleton
                v-if="dashboard.loading.value && !dashboard.student.value"
                class="h-7 w-64"
              />
              <h2 v-else class="truncate text-xl font-bold text-highlighted sm:text-2xl">
                {{ dashboard.student.value?.fullName || 'Student profile' }}
              </h2>
              <UBadge
                v-if="accountReady"
                label="Account ready"
                color="success"
                variant="soft"
                icon="i-lucide-circle-check"
              />
            </div>

            <p class="mt-1 text-sm font-semibold text-primary">
              {{ dashboard.student.value?.studentNo || 'Student number unavailable' }}
            </p>
            <p class="mt-1 text-sm text-muted">{{ programLine }}</p>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <StudentStatusBadge :status="dashboard.student.value?.studentStatus || 'Checking'" />
              <StudentStatusBadge :status="dashboard.membership.value.status" />
              <UBadge
                :label="dashboard.membership.value.enrollmentVerified ? 'Enrollment verified' : 'Verification pending'"
                :color="dashboard.membership.value.enrollmentVerified ? 'success' : 'warning'"
                variant="soft"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:max-w-sm lg:justify-end">
          <UButton
            to="/student/library-card"
            label="Library Card"
            icon="i-lucide-id-card"
            color="neutral"
            variant="soft"
            class="justify-center"
          />
          <UButton
            to="/student/notifications"
            label="Notifications"
            icon="i-lucide-bell"
            color="neutral"
            variant="soft"
            class="justify-center"
          />
        </div>
      </div>
    </UCard>

    <section aria-labelledby="attention-heading">
      <div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="attention-heading" class="text-base font-semibold text-highlighted">
            What needs your attention
          </h2>
          <p class="mt-1 text-sm text-muted">
            The most important actions from your current Library records.
          </p>
        </div>
        <p v-if="dashboard.data.value.generatedAt" class="text-xs text-muted">
          Updated {{ formatDateTime(dashboard.data.value.generatedAt) }}
        </p>
      </div>

      <div
        v-if="dashboard.loading.value && !dashboard.data.value.generatedAt"
        class="grid gap-3 lg:grid-cols-3"
      >
        <USkeleton v-for="index in 3" :key="index" class="h-32 w-full rounded-2xl" />
      </div>

      <div v-else class="grid gap-3 lg:grid-cols-3">
        <div
          v-for="item in attentionItems"
          :key="item.key"
          class="rounded-2xl border border-default bg-default p-4 sm:p-5"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl"
              :class="{
                'bg-error/10 text-error': item.color === 'error',
                'bg-warning/10 text-warning': item.color === 'warning',
                'bg-info/10 text-info': item.color === 'info',
                'bg-success/10 text-success': item.color === 'success',
              }"
            >
              <UIcon :name="item.icon" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-highlighted">{{ item.title }}</h3>
              <p class="mt-1 text-sm leading-5 text-muted">{{ item.description }}</p>
              <UButton
                v-if="item.to"
                :to="item.to"
                :label="item.action"
                icon="i-lucide-arrow-right"
                trailing
                color="neutral"
                variant="link"
                size="sm"
                class="mt-2 p-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="overview-heading">
      <div class="mb-3">
        <h2 id="overview-heading" class="text-base font-semibold text-highlighted">
          My Library overview
        </h2>
        <p class="mt-1 text-sm text-muted">
          A quick summary of books and reservations linked to your account.
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

    <section aria-labelledby="quick-actions-heading">
      <div class="mb-3">
        <h2 id="quick-actions-heading" class="text-base font-semibold text-highlighted">
          Quick actions
        </h2>
        <p class="mt-1 text-sm text-muted">
          Go directly to the Student Portal service you need.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="group rounded-2xl border border-default bg-default p-4 transition hover:border-primary/40 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="action.icon" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-3">
                <h3 class="font-semibold text-highlighted">{{ action.label }}</h3>
                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="size-4 shrink-0 text-dimmed transition group-hover:text-primary"
                />
              </div>
              <p class="mt-1 text-sm leading-5 text-muted">{{ action.description }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between gap-4 border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-id-card" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Membership and Library Card</h2>
              <p class="text-xs text-muted">Your current access and card information.</p>
            </div>
          </div>
          <UButton
            to="/student/library-card"
            label="Open"
            icon="i-lucide-arrow-right"
            trailing
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </div>

        <div class="divide-y divide-default">
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Membership</span>
            <StudentStatusBadge :status="dashboard.membership.value.status" />
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Academic term</span>
            <span class="text-right text-sm font-medium text-highlighted">
              {{ [dashboard.membership.value.academicYear, dashboard.membership.value.semester].filter(Boolean).join(' · ') || 'Not available' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Expires</span>
            <span class="text-right text-sm font-medium text-highlighted">
              {{ formatDate(dashboard.membership.value.expiryDate) }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Enrollment</span>
            <UBadge
              :label="dashboard.membership.value.enrollmentVerified ? 'Verified' : 'Pending'"
              :color="dashboard.membership.value.enrollmentVerified ? 'success' : 'warning'"
              variant="soft"
            />
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Card number</span>
            <span class="break-all text-right font-mono text-sm font-semibold text-highlighted">
              {{ dashboard.student.value?.libraryCardNo || 'Not assigned' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span class="text-sm text-muted">Card status</span>
            <StudentStatusBadge :status="dashboard.student.value?.libraryCardStatus || 'Checking'" />
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between gap-4 border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <UIcon name="i-lucide-bell-ring" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Recent notices</h2>
              <p class="text-xs text-muted">Important reminders from your Library records.</p>
            </div>
          </div>
          <UButton
            to="/student/notifications"
            :label="dashboard.notices.value.length ? `View all (${dashboard.notices.value.length})` : 'View notifications'"
            icon="i-lucide-arrow-right"
            trailing
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </div>

        <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="space-y-3 p-5 sm:p-6">
          <USkeleton v-for="index in 3" :key="index" class="h-20 w-full" />
        </div>

        <div v-else-if="visibleNotices.length" class="space-y-3 p-5 sm:p-6">
          <UAlert
            v-for="notice in visibleNotices"
            :key="notice.code"
            :color="noticeColor(notice.severity)"
            variant="soft"
            :icon="noticeIcon(notice.severity)"
            :title="notice.title"
            :description="notice.message"
          />
          <p v-if="hiddenNoticeCount" class="text-center text-xs text-muted">
            {{ hiddenNoticeCount }} more {{ hiddenNoticeCount === 1 ? 'notice' : 'notices' }} available in Notifications.
          </p>
        </div>

        <div v-else class="p-8 text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <UIcon name="i-lucide-circle-check-big" class="size-6" />
          </div>
          <p class="mt-3 text-sm font-semibold text-highlighted">No urgent notices</p>
          <p class="mt-1 text-sm text-muted">Your current Library records do not require immediate action.</p>
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
              <h2 class="font-semibold text-highlighted">Currently borrowed</h2>
              <p class="text-xs text-muted">
                {{ nextDueLoan ? `Next due: ${formatDate(nextDueLoan.dueDate)}` : 'Books currently issued to your account.' }}
              </p>
            </div>
          </div>
          <UButton
            to="/student/borrowings"
            label="View All"
            icon="i-lucide-arrow-right"
            trailing
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
            v-for="loan in dashboard.currentLoans.value.slice(0, 3)"
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
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span><span class="font-medium text-default">Due:</span> {{ formatDate(loan.dueDate) }}</span>
              <span><span class="font-medium text-default">Shelf:</span> {{ loan.copy.shelfLocation || 'Not available' }}</span>
            </div>
          </article>
        </div>

        <div v-else class="p-8 text-center">
          <UIcon name="i-lucide-book-check" class="mx-auto size-10 text-dimmed" />
          <p class="mt-3 text-sm font-medium text-highlighted">No books currently borrowed</p>
          <p class="mt-1 text-sm text-muted">Books issued to your account will appear here.</p>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between gap-4 border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <UIcon name="i-lucide-bookmark-check" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Active reservations</h2>
              <p class="text-xs text-muted">Pending, approved, and ready-for-pickup requests.</p>
            </div>
          </div>
          <UButton
            to="/student/reservations"
            label="View All"
            icon="i-lucide-arrow-right"
            trailing
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </div>

        <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="space-y-4 p-5 sm:p-6">
          <USkeleton v-for="index in 3" :key="index" class="h-24 w-full" />
        </div>

        <div v-else-if="dashboard.activeReservations.value.length" class="divide-y divide-default">
          <article
            v-for="reservation in dashboard.activeReservations.value.slice(0, 3)"
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
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span><span class="font-medium text-default">Reservation:</span> {{ reservation.reservationNo || 'Not available' }}</span>
              <span><span class="font-medium text-default">Expires:</span> {{ formatDate(reservation.expirationDate) }}</span>
            </div>
          </article>
        </div>

        <div v-else class="p-8 text-center">
          <UIcon name="i-lucide-bookmark" class="mx-auto size-10 text-dimmed" />
          <p class="mt-3 text-sm font-medium text-highlighted">No active reservations</p>
          <p class="mt-1 text-sm text-muted">Search the collection when you are ready to reserve a title.</p>
          <UButton
            to="/student/books"
            label="Browse Books"
            icon="i-lucide-search"
            color="primary"
            variant="soft"
            size="sm"
            class="mt-4"
          />
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
            <h2 class="font-semibold text-highlighted">Account security</h2>
            <p class="mt-1 max-w-2xl text-sm leading-5 text-muted">
              Your current Library session and device are recorded for account protection. Review or revoke sessions from Profile and Security.
            </p>
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-2 lg:min-w-[30rem]">
          <div class="rounded-xl border border-default bg-elevated/40 px-4 py-3">
            <p class="text-xs text-muted">Current device</p>
            <p class="mt-1 truncate text-sm font-semibold text-highlighted">
              {{ monitoring.device.value?.displayName || (monitoring.starting.value ? 'Registering device…' : 'Not registered') }}
            </p>
          </div>
          <div class="rounded-xl border border-default bg-elevated/40 px-4 py-3">
            <p class="text-xs text-muted">Session started</p>
            <p class="mt-1 text-sm font-semibold text-highlighted">
              {{ formatDateTime(monitoring.data.value?.loginAt) }}
            </p>
          </div>
        </div>

        <UButton
          to="/student/security"
          label="Review Security"
          icon="i-lucide-shield-user"
          color="neutral"
          variant="outline"
          class="shrink-0"
        />
      </div>
    </UCard>
  </div>
</template>
