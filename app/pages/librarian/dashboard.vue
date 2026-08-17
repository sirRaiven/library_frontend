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
    label: "Book Titles",
    value: dashboard.value.totalTitles,
    description: "Different book titles in the catalog",
    icon: "i-lucide-book",
    color: "info" as BadgeColor,
    to: "/librarian/books",
  },
  {
    label: "Total Book Copies",
    value: dashboard.value.totalCopies,
    description: "All physical book copies in the library",
    icon: "i-lucide-copy",
    color: "neutral" as BadgeColor,
    to: "/librarian/books/copies",
  },
  {
    label: "Available to Borrow",
    value: dashboard.value.availableCopies,
    description: "Books currently available on the shelf",
    icon: "i-lucide-circle-check",
    color: "success" as BadgeColor,
    to: "/librarian/books/copies?status=Available",
  },
  {
    label: "Currently Borrowed",
    value: dashboard.value.borrowedCopies,
    description: "Books currently with students or faculty",
    icon: "i-lucide-book-up",
    color: "warning" as BadgeColor,
    to: "/librarian/borrow",
  },
  {
    label: "Books Needing Attention",
    value: needsAttention.value,
    description: "Overdue, damaged, or reported lost",
    icon: "i-lucide-triangle-alert",
    color: "error" as BadgeColor,
    to: "/librarian/reports",
  },
  {
    label: "Visitors Today",
    value: dashboard.value.todayVisits,
    description: "Students and faculty who entered today",
    icon: "i-lucide-users-round",
    color: "success" as BadgeColor,
    to: "/librarian/visits",
  },
]);

const queueItems = computed(() => [
  {
    label: "Reservations to Review",
    value: dashboard.value.pendingReservations,
    description:
      "Book requests waiting for review or preparation",
    icon: "i-lucide-calendar-clock",
    color: "info" as BadgeColor,
    to: "/librarian/reservations",
  },
  {
    label: "Overdue Borrowed Books",
    value: dashboard.value.overdueTransactions,
    description:
      "Borrowed books that are already past the due date",
    icon: "i-lucide-clock-alert",
    color: "error" as BadgeColor,
    to: "/librarian/borrow?status=Overdue",
  },
  {
    label: "New Notifications",
    value: dashboard.value.unreadNotifications,
    description:
      "Updates and reminders that have not been opened",
    icon: "i-lucide-bell-ring",
    color: "warning" as BadgeColor,
    to: "/librarian/notifications",
  },
]);

const quickActions = [
  {
    title: "Record Library Entry",
    description:
      "Scan a student library card or faculty ID.",
    icon: "i-lucide-scan-line",
    to: "/librarian/visits",
  },
  {
    title: "Borrow a Book",
    description:
      "Record a book borrowed by a student or faculty member.",
    icon: "i-lucide-book-up",
    to: "/librarian/borrow",
  },
  {
    title: "Return a Book",
    description:
      "Scan and record a book returned to the library.",
    icon: "i-lucide-book-down",
    to: "/librarian/return",
  },
  {
    title: "Add a New Book",
    description:
      "Add a book title, its copies, and barcodes.",
    icon: "i-lucide-book-plus",
    to: "/librarian/books/register",
  },
  {
    title: "Upload Book List",
    description:
      "Add many existing book records from an Excel file.",
    icon: "i-lucide-file-spreadsheet",
    to: "/librarian/books/import",
  },
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
  <div class="space-y-6 m-4">
    <UCard
      class="sncbt-welcome-card border-primary/15 rounded-3xl shadow-md shadow-primary/15 p-0"
      :ui="{ body: 'p-0' }"
    >
      <div
        class="relative grid min-h-[14rem] lg:grid-cols-[minmax(0,1fr)_21rem]"
      >
        <div class="relative p-6 sm:p-7 lg:p-8">
          <div
            class="flex items-start gap-4 sm:gap-5"
          >
            <div
              class="sncbt-icon-tile hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/15 sm:flex"
            >
              <UIcon
                name="i-lucide-library-big"
                class="size-7"
              />
            </div>

            <div class="min-w-0 max-w-3xl">
              <UBadge
                color="primary"
                variant="soft"
                icon="i-lucide-sparkles"
                label="Library overview"
                class="rounded-full"
              />

              <h1
                class="mt-4 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl lg:text-[2rem]"
              >
                {{ greeting }}, {{ displayName }}
              </h1>

              <p
                class="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base"
              >
                See today's library activity, available books, borrowed books,
                reservations, and items that need your attention—all in one place.
              </p>

              <div
                class="mt-5 flex flex-wrap gap-2"
              >
                <div
                  class="inline-flex items-center gap-2 rounded-xl border border-default bg-elevated/70 px-3 py-2 text-xs text-muted shadow-[var(--sncbt-shadow-control)]"
                >
                  <UIcon
                    name="i-lucide-calendar-days"
                    class="size-4 text-primary"
                  />
                  <span>{{ currentDate }}</span>
                </div>

                <div
                  class="inline-flex items-center gap-2 rounded-xl border border-default bg-elevated/70 px-3 py-2 text-xs text-muted shadow-[var(--sncbt-shadow-control)]"
                >
                  <UIcon
                    name="i-lucide-clock-3"
                    class="size-4 text-primary"
                  />
                  <span>Updated {{ lastUpdated }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside
          class="relative flex flex-col justify-center border-t  border-default bg-elevated/45 sm:p-6 lg:border-l lg:border-t-0 rounded-3xl"
          aria-label="Dashboard quick actions"
        >
          <div class="space-y-2.5 ">
            <UButton
              to="/librarian/visits"
              label="Record Library Entry"
              icon="i-lucide-scan-line"
              color="primary"
              size="lg"
              block
            />

            <UButton
              to="/librarian/borrow"
              label="Borrow a Book"
              icon="i-lucide-book-up"
              color="neutral"
              variant="outline"
              size="lg"
              block
              class="bg-default/80"
            />

            <UButton
              label="Update Dashboard"
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              size="md"
              block
              :loading="isRefreshing"
              @click="refreshDashboard"
            />
          </div>
        </aside>
      </div>
    </UCard>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="The dashboard information could not be loaded"
      description="Please check your internet connection and select Try Again. If the problem continues, contact the system administrator."
      :actions="[
        {
          label: 'Try Again',
          color: 'error',
          variant: 'outline',
          onClick: refreshDashboard,
        },
      ]"
    />

    <UAlert
      v-else-if="
        dashboard.unavailableModules.length > 0
      "
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="Some information is temporarily unavailable"
      :description="`The dashboard could not load: ${dashboard.unavailableModules.join(', ')}. You can still use the available sections. Please ask the system administrator for help if the problem continues.`"
    />

    <section aria-labelledby="library-summary-heading">
      <div
        class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2
            id="library-summary-heading"
            class="text-lg font-semibold text-highlighted"
          >
            Today’s Library Summary
          </h2>
          <p class="mt-1 text-sm text-muted">
            Select a card to view the related records.
          </p>
        </div>
      </div>

      <div
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
      >
        <template v-if="status === 'pending'">
          <UCard
            v-for="item in 6"
            :key="item"
            class="rounded-2xl"
          >
            <USkeleton class="h-4 w-28" />
            <USkeleton class="mt-4 h-9 w-20" />
            <USkeleton class="mt-3 h-3 w-36" />
          </UCard>
        </template>

        <NuxtLink
          v-for="stat in stats"
          v-else
          :key="stat.label"
          :to="stat.to"
          class="group rounded-2xl border border-default bg-default p-5 shadow-sm shadow-emerald-100 transition hover:-translate-y-0.5 hover:border-success/40 hover:shadow-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {{ stat.label }}
              </p>
              <p
                class="mt-2 text-3xl font-bold tracking-tight text-highlighted"
              >
                {{ formatNumber(stat.value) }}
              </p>
            </div>

            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl"
              :class="{
                'bg-success/10 text-success':
                  stat.color === 'success',
                'bg-warning/10 text-warning':
                  stat.color === 'warning',
                'bg-error/10 text-error':
                  stat.color === 'error',
                'bg-info/10 text-info':
                  stat.color === 'info',
                'bg-elevated text-muted':
                  stat.color === 'neutral',
              }"
            >
              <UIcon
                :name="stat.icon"
                class="size-5"
              />
            </div>
          </div>

          <div
            class="mt-4 flex items-center justify-between gap-3"
          >
            <p class="text-xs text-muted">
              {{ stat.description }}
            </p>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="size-4 text-dimmed transition group-hover:text-success"
            />
          </div>
        </NuxtLink>
      </div>
    </section>

    <section
      class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]"
    >
      <UCard class="rounded-2xl shadow-sm shadow-emerald-100">
        <template #header>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2
                class="text-lg font-semibold text-highlighted"
              >
                Common Tasks
              </h2>
              <p class="mt-1 text-sm text-muted">
                Quickly open the tasks used most often each day.
              </p>
            </div>

            <UBadge
              color="success"
              variant="soft"
            >
              Frequently used
            </UBadge>
          </div>
        </template>

        <div
          class="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <NuxtLink
            v-for="action in quickActions"
            :key="action.title"
            :to="action.to"
            class="group flex items-start gap-4 rounded-2xl border border-default bg-elevated/50 p-4 transition hover:translate-y-0.5 hover:border-success/40 hover:bg-success/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
          >
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success transition group-hover:bg-success group-hover:text-white"
            >
              <UIcon
                :name="action.icon"
                class="size-5"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p
                class="font-semibold text-highlighted"
              >
                {{ action.title }}
              </p>
              <p
                class="mt-1 text-sm leading-relaxed text-muted"
              >
                {{ action.description }}
              </p>
            </div>

            <UIcon
              name="i-lucide-chevron-right"
              class="mt-1 size-4 shrink-0 text-dimmed transition group-hover:translate-x-0.5 group-hover:text-success"
            />
          </NuxtLink>
        </div>
      </UCard>

      <UCard class="rounded-2xl shadow-sm shadow-emerald-100">
        <template #header>
          <div>
            <h2
              class="text-lg font-semibold text-highlighted"
            >
              Items to Check
            </h2>
            <p class="mt-1 text-sm text-muted">
              Records that may need your attention today.
            </p>
          </div>
        </template>

        <div class="space-y-3">
          <NuxtLink
            v-for="item in queueItems"
            :key="item.label"
            :to="item.to"
            class="group flex items-center gap-4 rounded-xl border border-default p-4 transition hover:border-success/40 hover:bg-elevated"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl"
              :class="{
                'bg-success/10 text-success':
                  item.color === 'success',
                'bg-warning/10 text-warning':
                  item.color === 'warning',
                'bg-error/10 text-error':
                  item.color === 'error',
                'bg-info/10 text-info':
                  item.color === 'info',
              }"
            >
              <UIcon
                :name="item.icon"
                class="size-5"
              />
            </div>

            <div class="min-w-0 flex-1">
              <div
                class="flex items-center justify-between gap-3"
              >
                <p
                  class="truncate text-sm font-semibold text-highlighted"
                >
                  {{ item.label }}
                </p>
                <span
                  class="text-lg font-bold text-highlighted"
                >
                  {{ formatNumber(item.value) }}
                </span>
              </div>
              <p
                class="mt-1 text-xs leading-relaxed text-muted"
              >
                {{ item.description }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </UCard>
    </section>

    <UCard class="overflow-hidden rounded-2xl shadow-sm shadow-emerald-100">
      <template #header>
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2
              class="text-lg font-semibold text-highlighted"
            >
              Recent Borrowing Records
            </h2>
            <p class="mt-1 text-sm text-muted">
              Latest books borrowed by students and faculty.
            </p>
          </div>

          <UButton
            to="/librarian/borrow"
            label="See All Borrowing Records"
            trailing-icon="i-lucide-arrow-right"
            color="neutral"
            variant="ghost"
          />
        </div>
      </template>

      <div v-if="status === 'pending'">
        <div
          v-for="item in 5"
          :key="item"
          class="grid grid-cols-5 gap-4 border-b border-default p-4 last:border-b-0"
        >
          <USkeleton class="h-5 w-full" />
          <USkeleton class="h-5 w-full" />
          <USkeleton class="h-5 w-full" />
          <USkeleton class="h-5 w-full" />
          <USkeleton class="h-5 w-full" />
        </div>
      </div>

      <UEmpty
        v-else-if="
          dashboard.recentActivity.length === 0
        "
        icon="i-lucide-history"
        title="No borrowing records yet"
        description="Recent borrowing records will appear here after a book is borrowed."
        class="py-12"
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-190">
          <thead>
            <tr
              class="border-b border-default bg-elevated/50 text-left"
            >
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Borrower
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Book
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Book Barcode
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Borrowing Status
              </th>
              <th
                class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Borrowed On
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="activity in dashboard.recentActivity"
              :key="activity.id"
              class="border-b border-default last:border-b-0 hover:bg-elevated/40"
            >
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :alt="activity.borrower"
                    icon="i-lucide-user"
                    size="sm"
                  />
                  <div class="min-w-0">
                    <p
                      class="truncate text-sm font-medium text-highlighted"
                    >
                      {{ activity.borrower }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ activity.memberType }}
                    </p>
                  </div>
                </div>
              </td>

              <td
                class="max-w-64 px-5 py-4 text-sm text-default"
              >
                <p class="truncate">
                  {{ activity.title }}
                </p>
              </td>

              <td class="px-5 py-4">
                <code
                  class="rounded-md bg-elevated px-2 py-1 text-xs text-highlighted"
                >
                  {{ activity.barcode }}
                </code>
              </td>

              <td class="px-5 py-4">
                <UBadge
                  :color="
                    badgeColor(activity.status)
                  "
                  variant="soft"
                >
                  {{ activity.status }}
                </UBadge>
              </td>

              <td
                class="whitespace-nowrap px-5 py-4 text-sm text-muted"
              >
                {{ activity.date }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
