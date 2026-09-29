<script setup lang="ts">
type BadgeColor =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

interface BorrowingDashboardItem {
  documentId?: string;
  borrowNo?: string;
  borrowDate?: string;
  dueDate?: string;
  status?: string;
  memberType?: string;
  memberName?: string;
  memberIdentifier?: string;
  controlNumber?: string | null;
  accessionNumber?: string | null;
  title?: string;
}

interface LibrarianDashboardResponse {
  data: {
    totalTitles?: number;
    totalCopies?: number;
    availableCopies?: number;
    activeBorrowCount?: number;
    overdueBorrowCount?: number;
    pendingReservations?: number;
    unreadNotifications?: number;
    damagedCopies?: number;
    lostCopies?: number;
    todayVisits?: number;
    recent?: BorrowingDashboardItem[];
    unavailableModules?: string[];
  };
}

interface RecentActivity {
  id: string;
  borrower: string;
  memberType: "Student" | "Faculty" | "Member";
  title: string;
  barcode: string;
  status: string;
  date: string;
}

interface DashboardData {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  overdueTransactions: number;
  pendingReservations: number;
  unreadNotifications: number;
  damagedCopies: number;
  lostCopies: number;
  todayVisits: number;
  recentActivity: RecentActivity[];
  unavailableModules: string[];
  loadedAt: string;
}

definePageMeta({
  layout: "librarian",
  title: "Library Overview",
});

const auth = useAuth();
const toast = useToast();

const EMPTY_DASHBOARD: DashboardData = {
  totalTitles: 0,
  totalCopies: 0,
  availableCopies: 0,
  borrowedCopies: 0,
  overdueTransactions: 0,
  pendingReservations: 0,
  unreadNotifications: 0,
  damagedCopies: 0,
  lostCopies: 0,
  todayVisits: 0,
  recentActivity: [],
  unavailableModules: [],
  loadedAt: "",
};

function formatDate(value?: string): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

function normalizeBorrowingActivity(
  item: BorrowingDashboardItem,
  index: number,
): RecentActivity {
  const memberType: RecentActivity["memberType"] =
    item.memberType === "Student"
      ? "Student"
      : item.memberType === "Faculty"
        ? "Faculty"
        : "Member";

  return {
    id: String(item.documentId ?? item.borrowNo ?? index),
    borrower: item.memberName || "Borrower name unavailable",
    memberType,
    title: item.title || "Book title unavailable",
    barcode:
      item.controlNumber ??
      item.accessionNumber ??
      "No barcode",
    status: item.status || "Borrowed",
    date: formatDate(item.borrowDate),
  };
}

async function loadDashboard(): Promise<DashboardData> {
  const response = await auth.authFetch<LibrarianDashboardResponse>(
    "/api/circulation/dashboard-summary",
    {
      method: "GET",
      cache: "no-store",
      query: { limit: 8 },
    },
  );

  const data = response.data ?? {};
  return {
    totalTitles: data.totalTitles ?? 0,
    totalCopies: data.totalCopies ?? 0,
    availableCopies: data.availableCopies ?? 0,
    borrowedCopies: data.activeBorrowCount ?? 0,
    overdueTransactions: data.overdueBorrowCount ?? 0,
    pendingReservations: data.pendingReservations ?? 0,
    unreadNotifications: data.unreadNotifications ?? 0,
    damagedCopies: data.damagedCopies ?? 0,
    lostCopies: data.lostCopies ?? 0,
    todayVisits: data.todayVisits ?? 0,
    recentActivity: (data.recent ?? []).map(normalizeBorrowingActivity),
    unavailableModules: data.unavailableModules ?? [],
    loadedAt: new Date().toISOString(),
  };
}

const {
  data: dashboard,
  status,
  error,
  refresh,
} = useAsyncData(
  "librarian-dashboard",
  loadDashboard,
  {
    server: false,
    lazy: true,
    default: () => ({ ...EMPTY_DASHBOARD }),
  },
);

const isRefreshing = ref(false);

const displayName = computed(
  () =>
    auth.user.value?.username
      ?.split(/[\s._-]+/)
      .filter(Boolean)[0] || "Librarian",
);

const greeting = computed(() => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
});

const currentDate = computed(() =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date()),
);

const lastUpdated = computed(() => {
  if (!dashboard.value.loadedAt) {
    return "Not updated yet";
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dashboard.value.loadedAt));
});

const needsAttention = computed(
  () =>
    dashboard.value.overdueTransactions +
    dashboard.value.damagedCopies +
    dashboard.value.lostCopies,
);

const stats = computed(() => [
  {
    label: "Available",
    value: dashboard.value.availableCopies,
    description: "Ready to borrow",
    icon: "i-lucide-circle-check",
    color: "success" as BadgeColor,
    to: "/librarian/books/copies?status=Available",
  },
  {
    label: "Borrowed",
    value: dashboard.value.borrowedCopies,
    description: "Currently on loan",
    icon: "i-lucide-book-up",
    color: "warning" as BadgeColor,
    to: "/librarian/history?category=borrowing&search=Borrowed",
  },
  {
    label: "Needs Attention",
    value: needsAttention.value,
    description: "Overdue, damaged or lost",
    icon: "i-lucide-triangle-alert",
    color: "error" as BadgeColor,
    to: "/librarian/reports",
  },
  {
    label: "Visits Today",
    value: dashboard.value.todayVisits,
    description: "Recorded library entries",
    icon: "i-lucide-users-round",
    color: "info" as BadgeColor,
    to: "/librarian/visits",
  },
]);

const queueItems = computed(() => [
  {
    label: "Reservations to Review",
    value: dashboard.value.pendingReservations,
    description: "Requests waiting for review or preparation",
    icon: "i-lucide-calendar-clock",
    color: "info" as BadgeColor,
    to: "/librarian/reservations?status=Pending",
  },
  {
    label: "Overdue Borrowed Books",
    value: dashboard.value.overdueTransactions,
    description: "Loans already past their due date",
    icon: "i-lucide-clock-alert",
    color: "error" as BadgeColor,
    to: "/librarian/history?category=borrowing&search=Overdue",
  },
]);

const quickActions = [
  { title: "Scan Entry", icon: "i-lucide-scan-line", to: "/librarian/visits" },
  { title: "Borrow", icon: "i-lucide-book-up", to: "/librarian/borrow" },
  { title: "Return", icon: "i-lucide-book-down", to: "/librarian/return" },
  { title: "Reservations", icon: "i-lucide-calendar-check-2", to: "/librarian/reservations" },
  { title: "Student Records", icon: "i-lucide-notebook-tabs", to: "/librarian/students" },
  { title: "Add Book", icon: "i-lucide-book-plus", to: "/librarian/books/register" },
];

function badgeColor(
  statusValue: string,
): BadgeColor {
  switch (statusValue) {
    case "Borrowed":
      return "warning";
    case "Returned":
      return "success";
    case "Overdue":
    case "Lost":
      return "error";
    default:
      return "neutral";
  }
}

async function refreshDashboard() {
  if (isRefreshing.value) {
    return;
  }

  isRefreshing.value = true;

  try {
    await refresh();

    toast.add({
      title: "Dashboard updated",
      description:
        "The latest library information is now shown.",
      color: "success",
      icon: "i-lucide-refresh-cw",
    });
  } finally {
    isRefreshing.value = false;
  }
}
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-5">
    <section class="sncbt-page-hero overflow-hidden rounded-2xl border border-default/80 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div class="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Library Operations
          </p>
          <h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-highlighted sm:text-[1.75rem]">
            {{ greeting }}, {{ displayName }}
          </h1>
          <p class="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
            Review today&apos;s circulation, resolve items that need attention, and continue common Library tasks.
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
          <div class="rounded-xl border border-default/70 bg-default/65 px-3.5 py-2.5 text-xs text-muted">
            <p class="font-semibold text-highlighted">{{ currentDate }}</p>
            <p class="mt-0.5">Updated {{ lastUpdated }}</p>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            label="Refresh"
            color="neutral"
            variant="outline"
            :loading="isRefreshing"
            @click="refreshDashboard"
          />
        </div>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="The dashboard information could not be loaded"
      description="Please check your connection and try again."
      :actions="[{ label: 'Try Again', color: 'error', variant: 'outline', onClick: refreshDashboard }]"
    />

    <UAlert
      v-else-if="dashboard.unavailableModules.length > 0"
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="Some information is temporarily unavailable"
      :description="`Unavailable: ${dashboard.unavailableModules.join(', ')}. The available library tools can still be used.`"
    />

    <section aria-labelledby="library-summary-heading">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="library-summary-heading" class="text-base font-semibold text-highlighted sm:text-lg">
            Today&apos;s Library Summary
          </h2>
          <p class="mt-0.5 text-xs text-muted sm:text-sm">
            Current collection availability and Library activity at a glance.
          </p>
        </div>
        <NuxtLink to="/librarian/books" class="text-xs font-semibold text-primary hover:underline">
          {{ formatNumber(dashboard.totalTitles) }} titles · {{ formatNumber(dashboard.totalCopies) }} copies
        </NuxtLink>
      </div>

      <div class="sncbt-compact-metrics">
        <template v-if="status === 'pending'">
          <USkeleton v-for="item in 4" :key="item" class="h-28 rounded-xl" />
        </template>

        <NuxtLink
          v-for="stat in stats"
          v-else
          :key="stat.label"
          :to="stat.to"
          class="sncbt-metric-card sncbt-card-interactive group cursor-pointer"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-muted">{{ stat.label }}</p>
              <p class="mt-1.5 text-2xl font-bold tracking-tight text-highlighted">
                {{ formatNumber(stat.value) }}
              </p>
              <p class="mt-1 hidden text-xs text-muted sm:block">{{ stat.description }}</p>
            </div>
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-lg"
              :class="{
                'bg-success/10 text-success': stat.color === 'success',
                'bg-warning/10 text-warning': stat.color === 'warning',
                'bg-error/10 text-error': stat.color === 'error',
                'bg-info/10 text-info': stat.color === 'info',
                'bg-elevated text-muted': stat.color === 'neutral',
              }"
            >
              <UIcon :name="stat.icon" class="size-4.5" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]">
      <div class="sncbt-card overflow-hidden rounded-xl border border-default/80 p-4 sm:p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-highlighted sm:text-lg">Circulation Desk</h2>
            <p class="mt-0.5 text-xs text-muted sm:text-sm">Start the most common Library tasks.</p>
          </div>
          <UIcon name="i-lucide-workflow" class="size-5 text-primary" />
        </div>

        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <NuxtLink
            v-for="action in quickActions"
            :key="action.title"
            :to="action.to"
            class="sncbt-quick-action group flex min-h-24 flex-col justify-between gap-4 p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-28 sm:p-4"
          >
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-150 group-hover:-translate-y-0.5">
              <UIcon :name="action.icon" class="size-5" />
            </div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-highlighted">{{ action.title }}</p>
              <UIcon name="i-lucide-arrow-up-right" class="size-4 text-muted transition-colors group-hover:text-primary" />
            </div>
          </NuxtLink>
        </div>
      </div>

      <div class="sncbt-card overflow-hidden rounded-xl border border-default/80 p-4 sm:p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-highlighted sm:text-lg">Priority Queue</h2>
            <p class="mt-0.5 text-xs text-muted sm:text-sm">Items that may need staff action.</p>
          </div>
          <UBadge :color="needsAttention > 0 ? 'error' : 'success'" variant="soft">
            {{ needsAttention > 0 ? `${formatNumber(needsAttention)} attention` : 'All clear' }}
          </UBadge>
        </div>

        <div class="space-y-2">
          <NuxtLink
            v-for="item in queueItems"
            :key="item.label"
            :to="item.to"
            class="sncbt-record-row group flex items-center gap-3 rounded-xl border border-default/70 p-3.5 transition-colors hover:border-primary/25 hover:bg-elevated/50"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl"
              :class="{
                'bg-error/10 text-error': item.color === 'error',
                'bg-info/10 text-info': item.color === 'info',
              }"
            >
              <UIcon :name="item.icon" class="size-4.5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-highlighted">{{ item.label }}</p>
              <p class="mt-0.5 hidden text-xs text-muted sm:block">{{ item.description }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xl font-bold text-highlighted">{{ formatNumber(item.value) }}</span>
              <UIcon name="i-lucide-chevron-right" class="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </div>
          </NuxtLink>

          <NuxtLink
            to="/librarian/notifications"
            class="sncbt-record-row group flex items-center gap-3 rounded-xl border border-default/70 p-3.5 transition-colors hover:border-primary/25 hover:bg-elevated/50"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-bell" class="size-4.5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-highlighted">Unread Notifications</p>
              <p class="mt-0.5 hidden text-xs text-muted sm:block">Library notices that have not been reviewed.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xl font-bold text-highlighted">{{ formatNumber(dashboard.unreadNotifications) }}</span>
              <UIcon name="i-lucide-chevron-right" class="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section aria-labelledby="recent-borrowing-heading" class="sncbt-card overflow-hidden rounded-xl border border-default/80">
      <div class="flex flex-col gap-3 border-b border-default/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 id="recent-borrowing-heading" class="text-base font-semibold text-highlighted sm:text-lg">
            Recent Circulation
          </h2>
          <p class="mt-0.5 text-xs text-muted sm:text-sm">
            Latest borrowing activity from Student and Faculty accounts.
          </p>
        </div>
        <UButton
          to="/librarian/history?category=borrowing"
          label="View borrowing history"
          trailing-icon="i-lucide-arrow-right"
          color="neutral"
          variant="ghost"
          size="sm"
          class="self-start sm:self-auto"
        />
      </div>

      <div v-if="status === 'pending'" class="space-y-2 p-4 sm:p-5">
        <USkeleton v-for="item in 5" :key="item" class="h-20 rounded-xl" />
      </div>

      <UEmpty
        v-else-if="dashboard.recentActivity.length === 0"
        icon="i-lucide-history"
        title="No borrowing records yet"
        description="Recent borrowing records will appear here after a book is borrowed."
        class="py-12"
      />

      <div v-else class="divide-y divide-default/70">
        <div
          v-for="activity in dashboard.recentActivity"
          :key="activity.id"
          class="grid gap-3 px-4 py-3.5 transition-colors hover:bg-elevated/35 sm:px-5 md:grid-cols-[minmax(9rem,0.9fr)_minmax(14rem,1.45fr)_minmax(7rem,0.55fr)_auto] md:items-center md:gap-4"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon :name="activity.memberType === 'Faculty' ? 'i-lucide-briefcase-business' : 'i-lucide-graduation-cap'" class="size-4" />
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">{{ activity.borrower }}</p>
                <p class="text-xs text-muted">{{ activity.memberType }}</p>
              </div>
            </div>
          </div>

          <div class="min-w-0 pl-10 md:pl-0">
            <p class="truncate text-sm font-medium text-highlighted">{{ activity.title }}</p>
            <p class="mt-0.5 truncate font-mono text-[11px] text-muted">{{ activity.barcode }}</p>
          </div>

          <div class="pl-10 md:pl-0">
            <UBadge :color="badgeColor(activity.status)" variant="soft">
              {{ activity.status }}
            </UBadge>
          </div>

          <div class="flex items-center justify-between gap-3 pl-10 text-xs text-muted md:block md:pl-0 md:text-right">
            <span class="md:hidden">Borrowed on</span>
            <span class="whitespace-nowrap">{{ activity.date }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
