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
    label: "My Account",
    description: "Manage contact details, password, sessions, and devices.",
    icon: "i-lucide-user-round-cog",
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
      to: "/student/borrowings?attention=overdue",
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
      to: "/student/borrowings?attention=due-soon",
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
      to: "/student/reservations?status=ready",
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
  <div class="sncbt-page-shell sncbt-member-page space-y-5 sm:space-y-6">
    <UCard class="sncbt-member-dashboard-hero" :ui="{ body: 'p-5 sm:p-7 lg:p-8' }">
      <div class="relative z-[1] grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:items-center">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge label="Student Portal" color="primary" variant="soft" icon="i-lucide-graduation-cap" />
            <span v-if="dashboard.data.value.generatedAt" class="text-xs text-muted">
              Updated {{ formatDateTime(dashboard.data.value.generatedAt) }}
            </span>
          </div>

          <h1 class="mt-4 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl lg:text-4xl">
            {{ dashboard.student.value ? `Welcome back, ${firstName}` : 'Welcome to your Library' }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Keep track of your borrowed books, reservations, Library Card, and account activity from one place.
          </p>

          <div class="mt-5 flex flex-wrap gap-2">
            <UButton to="/student/books" label="Browse Collection" icon="i-lucide-search" color="primary" />
            <UButton to="/student/borrowings" label="My Borrowed Books" icon="i-lucide-book-open-check" color="neutral" variant="outline" class="hidden lg:inline-flex" />
            <UButton
              label="Refresh"
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              :loading="dashboard.loading.value"
              @click="refresh"
            />
          </div>
        </div>

        <div class="rounded-2xl border border-primary/15 bg-default/75 p-4 shadow-sm sm:p-5">
          <div class="flex items-center gap-4">
            <USkeleton
              v-if="dashboard.loading.value && !dashboard.student.value"
              class="size-16 shrink-0 rounded-2xl"
            />
            <UAvatar
              v-else
              :src="mediaUrl(dashboard.student.value?.photoUrl ?? null) || undefined"
              :alt="dashboard.student.value?.fullName || 'Student'"
              :text="dashboard.student.value?.fullName?.split(/\s+/).slice(0, 2).map(part => part[0]).join('') || 'S'"
              size="2xl"
              class="size-16 shrink-0 rounded-2xl ring-4 ring-primary/10"
            />

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-lg font-bold text-highlighted">
                  {{ dashboard.student.value?.fullName || 'Student account' }}
                </h2>
                <UBadge
                  v-if="accountReady"
                  label="Ready"
                  color="success"
                  variant="soft"
                  icon="i-lucide-circle-check"
                />
              </div>
              <p class="mt-1 text-sm font-semibold text-primary">
                {{ dashboard.student.value?.studentNo || 'Student number unavailable' }}
              </p>
              <p class="mt-1 line-clamp-2 text-xs leading-5 text-muted">{{ programLine }}</p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="rounded-xl border border-default/80 bg-elevated/35 px-3 py-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Membership</p>
              <div class="mt-1.5"><StudentStatusBadge :status="dashboard.membership.value.status" /></div>
            </div>
            <div class="rounded-xl border border-default/80 bg-elevated/35 px-3 py-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Library Card</p>
              <div class="mt-1.5"><StudentStatusBadge :status="dashboard.student.value?.libraryCardStatus || 'Checking'" /></div>
            </div>
          </div>

          <UButton
            to="/student/security"
            label="Open My Account"
            icon="i-lucide-user-round-cog"
            color="neutral"
            variant="ghost"
            size="sm"
            block
            class="mt-3"
          />
        </div>
      </div>
    </UCard>

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

    <section aria-labelledby="overview-heading">
      <div class="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 id="overview-heading" class="text-base font-semibold text-highlighted">Library at a glance</h2>
          <p class="mt-1 text-sm text-muted">Your current borrowing and reservation activity.</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StudentMetricCard
          v-for="item in metricCards"
          :key="item.label"
          v-bind="item"
          :loading="dashboard.loading.value && !dashboard.data.value.generatedAt"
        />
      </div>
    </section>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex flex-col gap-3 border-b border-default p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 class="font-semibold text-highlighted">My books</h2>
            <p class="mt-1 text-xs text-muted">Borrowed titles and reservation requests that are currently active.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton to="/student/borrowings" label="Borrowed" icon="i-lucide-book-open-check" color="neutral" variant="outline" size="sm" />
            <UButton to="/student/reservations" label="Reservations" icon="i-lucide-bookmark-check" color="neutral" variant="outline" size="sm" />
          </div>
        </div>

        <div class="grid divide-y divide-default lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <section class="min-w-0 p-5 sm:p-6" aria-labelledby="borrowed-dashboard-heading">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id="borrowed-dashboard-heading" class="text-sm font-semibold text-highlighted">Currently borrowed</h3>
                <p class="mt-1 text-xs text-muted">
                  {{ nextDueLoan ? `Next due ${formatDate(nextDueLoan.dueDate)}` : 'No upcoming due date' }}
                </p>
              </div>
              <span class="text-2xl font-bold text-highlighted">{{ dashboard.metrics.value.currentLoans }}</span>
            </div>

            <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="space-y-3">
              <USkeleton v-for="index in 3" :key="index" class="h-20 w-full" />
            </div>
            <div v-else-if="dashboard.currentLoans.value.length" class="space-y-3">
              <article
                v-for="loan in dashboard.currentLoans.value.slice(0, 3)"
                :key="loan.documentId"
                class="rounded-xl border border-default/80 bg-elevated/25 p-3.5"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="line-clamp-2 text-sm font-semibold text-highlighted">{{ loan.book.title }}</h4>
                    <p class="mt-1 truncate text-xs text-muted">{{ loan.book.author }}</p>
                  </div>
                  <UBadge
                    :label="dueLabel(loan.daysRemaining, loan.isOverdue)"
                    :color="loan.isOverdue ? 'error' : loan.daysRemaining !== null && loan.daysRemaining <= 3 ? 'warning' : 'neutral'"
                    variant="soft"
                    size="sm"
                    class="shrink-0"
                  />
                </div>
              </article>
            </div>
            <div v-else class="rounded-xl border border-dashed border-default p-6 text-center">
              <UIcon name="i-lucide-book-check" class="mx-auto size-8 text-dimmed" />
              <p class="mt-2 text-sm font-medium text-highlighted">No borrowed books</p>
              <p class="mt-1 text-xs text-muted">Books issued to your account will appear here.</p>
            </div>
          </section>

          <section class="min-w-0 p-5 sm:p-6" aria-labelledby="reservation-dashboard-heading">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id="reservation-dashboard-heading" class="text-sm font-semibold text-highlighted">Active reservations</h3>
                <p class="mt-1 text-xs text-muted">Pending, approved, and ready for pickup.</p>
              </div>
              <span class="text-2xl font-bold text-highlighted">{{ dashboard.metrics.value.activeReservations }}</span>
            </div>

            <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="space-y-3">
              <USkeleton v-for="index in 3" :key="index" class="h-20 w-full" />
            </div>
            <div v-else-if="dashboard.activeReservations.value.length" class="space-y-3">
              <article
                v-for="reservation in dashboard.activeReservations.value.slice(0, 3)"
                :key="reservation.documentId"
                class="rounded-xl border border-default/80 bg-elevated/25 p-3.5"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="line-clamp-2 text-sm font-semibold text-highlighted">{{ reservation.book.title }}</h4>
                    <p class="mt-1 truncate text-xs text-muted">{{ reservation.book.author }}</p>
                  </div>
                  <StudentStatusBadge :status="reservation.status" />
                </div>
              </article>
            </div>
            <div v-else class="rounded-xl border border-dashed border-default p-6 text-center">
              <UIcon name="i-lucide-bookmark" class="mx-auto size-8 text-dimmed" />
              <p class="mt-2 text-sm font-medium text-highlighted">No active reservations</p>
              <UButton to="/student/books" label="Browse books" color="primary" variant="link" size="sm" class="mt-1 p-0" />
            </div>
          </section>
        </div>
      </UCard>

      <div class="space-y-5">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 id="attention-heading" class="font-semibold text-highlighted">Action center</h2>
              <p class="mt-1 text-xs text-muted">Items that may need your attention.</p>
            </div>
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-sparkles" class="size-5" />
            </div>
          </div>

          <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="mt-4 space-y-3">
            <USkeleton v-for="index in 3" :key="index" class="h-20 w-full rounded-xl" />
          </div>
          <div v-else class="mt-4 space-y-2.5">
            <div
              v-for="item in attentionItems"
              :key="item.key"
              class="rounded-xl border border-default/80 bg-elevated/25 p-3.5"
            >
              <div class="flex items-start gap-3">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  :class="{
                    'bg-error/10 text-error': item.color === 'error',
                    'bg-warning/10 text-warning': item.color === 'warning',
                    'bg-info/10 text-info': item.color === 'info',
                    'bg-success/10 text-success': item.color === 'success',
                  }"
                >
                  <UIcon :name="item.icon" class="size-4.5" />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-semibold text-highlighted">{{ item.title }}</h3>
                  <p class="mt-1 text-xs leading-5 text-muted">{{ item.description }}</p>
                  <UButton
                    v-if="item.to"
                    :to="item.to"
                    :label="item.action"
                    icon="i-lucide-arrow-right"
                    trailing
                    color="neutral"
                    variant="link"
                    size="xs"
                    class="mt-1.5 h-auto p-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold text-highlighted">Account snapshot</h2>
              <p class="mt-1 text-xs text-muted">Membership, card, and account access.</p>
            </div>
            <UButton to="/student/security" label="My Account" icon="i-lucide-arrow-right" trailing color="neutral" variant="ghost" size="sm" />
          </div>

          <dl class="mt-4 divide-y divide-default/80 rounded-xl border border-default/80">
            <div class="flex items-center justify-between gap-4 px-3.5 py-3">
              <dt class="text-xs text-muted">Enrollment</dt>
              <UBadge
                :label="dashboard.membership.value.enrollmentVerified ? 'Verified' : 'Pending'"
                :color="dashboard.membership.value.enrollmentVerified ? 'success' : 'warning'"
                variant="soft"
                size="sm"
              />
            </div>
            <div class="flex items-center justify-between gap-4 px-3.5 py-3">
              <dt class="text-xs text-muted">Membership valid until</dt>
              <dd class="text-xs font-semibold text-highlighted">{{ formatDate(dashboard.membership.value.expiryDate) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 px-3.5 py-3">
              <dt class="text-xs text-muted">Library Card</dt>
              <dd class="font-mono text-xs font-semibold text-highlighted">{{ dashboard.student.value?.libraryCardNo || 'Not issued' }}</dd>
            </div>
          </dl>
        </UCard>
      </div>
    </div>

    <section aria-labelledby="quick-actions-heading" class="hidden lg:block">
      <div class="mb-3">
        <h2 id="quick-actions-heading" class="text-base font-semibold text-highlighted">Quick access</h2>
        <p class="mt-1 text-sm text-muted">Jump to the Library service you need.</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="group flex items-center gap-3 rounded-xl border border-default bg-default px-4 py-3.5 transition hover:border-primary/35 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon :name="action.icon" class="size-4.5" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="truncate text-sm font-semibold text-highlighted">{{ action.label }}</h3>
            <p class="mt-0.5 line-clamp-1 text-xs text-muted">{{ action.description }}</p>
          </div>
          <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-dimmed transition group-hover:text-primary" />
        </NuxtLink>
      </div>
    </section>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div class="flex flex-col gap-3 border-b border-default p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <UIcon name="i-lucide-bell-ring" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">Recent notices</h2>
            <p class="text-xs text-muted">Reminders and updates from your Library records.</p>
          </div>
        </div>
        <UButton
          to="/student/notifications"
          :label="dashboard.notices.value.length ? `View all (${dashboard.notices.value.length})` : 'View notifications'"
          icon="i-lucide-arrow-right"
          trailing
          color="neutral"
          variant="outline"
          size="sm"
        />
      </div>

      <div v-if="dashboard.loading.value && !dashboard.data.value.generatedAt" class="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        <USkeleton v-for="index in 3" :key="index" class="h-24 w-full" />
      </div>
      <div v-else-if="visibleNotices.length" class="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        <UAlert
          v-for="notice in visibleNotices"
          :key="notice.code"
          :color="noticeColor(notice.severity)"
          variant="soft"
          :icon="noticeIcon(notice.severity)"
          :title="notice.title"
          :description="notice.message"
        />
      </div>
      <div v-else class="p-7 text-center sm:p-8">
        <div class="mx-auto flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
          <UIcon name="i-lucide-circle-check-big" class="size-5" />
        </div>
        <p class="mt-3 text-sm font-semibold text-highlighted">You are all caught up</p>
        <p class="mt-1 text-xs text-muted">There are no urgent Library notices right now.</p>
      </div>
    </UCard>
  </div>
</template>
