<script setup lang="ts">
type BadgeColor =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

interface StrapiListResponse<T> {
  data: T[];
  meta?: {
    pagination?: StrapiPagination;
  };
}

interface BookRecord {
  id?: number;
  documentId?: string;
  title?: string;
  author?: string;
  control_number?: string;
}

interface BookCopyRecord {
  id?: number;
  documentId?: string;
  accession_number?: string;
  control_number?: string;
  copy_status?: string;
  book?: unknown;
}

interface LibraryMemberRecord {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
}

interface BorrowTransactionRecord {
  id?: number;
  documentId?: string;
  borrow_no?: string;
  borrow_date?: string;
  due_date?: string;
  borrow_transaction_status?: string;
  createdAt?: string;
  book?: unknown;
  book_copy?: unknown;
  bookCopy?: unknown;
  student?: unknown;
  students?: unknown;
  faculty?: unknown;
  faculties?: unknown;
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

function unwrapOne<T>(value: unknown): T | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value
  ) {
    const data = (value as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return (data[0] as T | undefined) ?? null;
    }

    return (data as T | null | undefined) ?? null;
  }

  if (Array.isArray(value)) {
    return (value[0] as T | undefined) ?? null;
  }

  return value as T;
}

function unwrapMany<T>(value: unknown): T[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value
  ) {
    const data = (value as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return data as T[];
    }

    return data ? [data as T] : [];
  }

  return [value as T];
}

function formatMemberName(
  member: LibraryMemberRecord | null,
): string {
  if (!member) {
    return "Borrower name unavailable";
  }

  return (
    [
      member.first_name,
      member.middle_name,
      member.last_name,
      member.suffix,
    ]
      .filter(Boolean)
      .join(" ") || "Borrower name unavailable"
  );
}

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
  return new Intl.NumberFormat("en-PH").format(
    value,
  );
}

async function getCollectionCount(
  path: string,
  query: Record<string, unknown> = {},
): Promise<number> {
  const response =
    await auth.authFetch<StrapiListResponse<unknown>>(
      path,
      {
        method: "GET",
        query: {
          ...query,
          "pagination[page]": 1,
          "pagination[pageSize]": 1,
        },
      },
    );

  return (
    response.meta?.pagination?.total ??
    response.data.length
  );
}

function normalizeRecentActivity(
  transaction: BorrowTransactionRecord,
  index: number,
): RecentActivity {
  const students = unwrapMany<LibraryMemberRecord>(
    transaction.students ?? transaction.student,
  );
  const faculties =
    unwrapMany<LibraryMemberRecord>(
      transaction.faculties ??
        transaction.faculty,
    );

  const member = students[0] ?? faculties[0] ?? null;
  // @ts-ignore
  const memberType: RecentActivity["memberType"] =
    students.length > 0
      ? "Student"
      : faculties.length > 0
        ? "Faculty"
        : "Library Member";

  const copy = unwrapOne<BookCopyRecord>(
    transaction.book_copy ??
      transaction.bookCopy,
  );

  const directBook = unwrapOne<BookRecord>(
    transaction.book,
  );

  const copyBook = unwrapOne<BookRecord>(copy?.book);
  const book = copyBook ?? directBook;

  return {
    id: String(
      transaction.documentId ??
        transaction.id ??
        index,
    ),
    borrower: formatMemberName(member),
    memberType,
    title:
      book?.title ??
      (copy?.control_number
        ? `Book Copy ${copy.control_number}`
        : "Book title unavailable"),
    barcode:
      copy?.control_number ??
      directBook?.control_number ??
      "No barcode",
    status:
      transaction.borrow_transaction_status ??
      "Borrowed",
    date: formatDate(
      transaction.borrow_date ??
        transaction.createdAt,
    ),
  };
}

async function getRecentActivity(): Promise<
  RecentActivity[]
> {
  const response =
    await auth.authFetch<
      StrapiListResponse<BorrowTransactionRecord>
    >("/api/borrow-transactions", {
      method: "GET",
      query: {
        "sort[0]":
          "createdAt:desc",
        "pagination[page]":
          1,
        "pagination[pageSize]":
          8,

        /*
         * Current Borrow Transaction relationships:
         * student, faculty, and book_copy.
         */
        "populate[student]":
          "true",
        "populate[faculty]":
          "true",
        "populate[book_copy][populate][book]":
          "true",
      },
    });

  return response.data.map(
    normalizeRecentActivity,
  );
}

async function loadDashboard(): Promise<DashboardData> {
  const unavailableModules: string[] = [];

  async function safeCount(
    label: string,
    path: string,
    query: Record<string, unknown> = {},
  ): Promise<number> {
    try {
      return await getCollectionCount(path, query);
    } catch {
      unavailableModules.push(label);
      return 0;
    }
  }

  async function safeRecentActivity() {
    try {
      return await getRecentActivity();
    } catch {
      unavailableModules.push(
        "Recent borrowing records",
      );
      return [];
    }
  }

  async function safeTodayVisits() {
    try {
      const response =
        await auth.authFetch<{
          data: {
            totalVisits: number;
          };
        }>(
          "/api/library-visits/summary",
          {
            method: "GET",
          },
        );

      return (
        response.data
          .totalVisits ?? 0
      );
    } catch {
      unavailableModules.push(
        "Visitor records",
      );
      return 0;
    }
  }

  const [
    totalTitles,
    totalCopies,
    availableCopies,
    borrowedCopies,
    overdueTransactions,
    pendingReservations,
    unreadNotifications,
    damagedCopies,
    lostCopies,
    todayVisits,
    recentActivity,
  ] = await Promise.all([
    safeCount("Book records", "/api/books"),
    safeCount(
      "Book copies",
      "/api/book-copies",
    ),
    safeCount(
      "Available books",
      "/api/book-copies",
      {
        "filters[copy_status][$eq]":
          "Available",
      },
    ),
    safeCount(
      "Borrowed books",
      "/api/borrow-transactions",
      {
        "filters[borrow_transaction_status][$in][0]":
          "Borrowed",
        "filters[borrow_transaction_status][$in][1]":
          "Overdue",
      },
    ),
    safeCount(
      "Overdue books",
      "/api/borrow-transactions",
      {
        "filters[borrow_transaction_status][$eq]":
          "Overdue",
      },
    ),
    safeCount(
      "Reservations",
      "/api/reservations",
      {
        "filters[reservation_status][$eq]":
          "Pending",
      },
    ),
    safeCount(
      "New notifications",
      "/api/notifications",
      {
        "filters[is_read][$eq]": false,
      },
    ),
    safeCount(
      "Damaged books",
      "/api/book-copies",
      {
        "filters[copy_status][$eq]":
          "Damaged",
      },
    ),
    safeCount(
      "Lost books",
      "/api/book-copies",
      {
        "filters[copy_status][$eq]": "Lost",
      },
    ),
    safeTodayVisits(),
    safeRecentActivity(),
  ]);

  return {
    totalTitles,
    totalCopies,
    availableCopies,
    borrowedCopies,
    overdueTransactions,
    pendingReservations,
    unreadNotifications,
    damagedCopies,
    lostCopies,
    todayVisits,
    recentActivity,
    unavailableModules: [
      ...new Set(unavailableModules),
    ],
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
    icon: "i-lucide-books",
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
    <section
      class="relative overflow-hidden rounded-3xl border border-success/20 bg-linear-to-br from-success/10 via-default to-default p-6 sm:p-8"
    >
      <div
        class="absolute -right-16 -top-20 size-64 rounded-full bg-success/10 blur-3xl"
      />

      <div
        class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="max-w-3xl">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success"
          >
            <span
              class="size-2 rounded-full bg-success"
            />
            Library overview
          </div>

          <h1
            class="mt-4 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
          >
            {{ greeting }}, {{ displayName }}
          </h1>

          <p
            class="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base"
          >
            See today's library activity, available books,
            borrowed books, reservations, and items that need
            your attention—all in one place.
          </p>

          <div
            class="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted"
          >
            <span class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-calendar-days"
                class="size-4"
              />
              {{ currentDate }}
            </span>

            <span class="hidden sm:inline">•</span>

            <span class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-clock-3"
                class="size-4"
              />
              Information updated at {{ lastUpdated }}
            </span>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-56 lg:flex-col"
        >
          <UButton
            to="/librarian/visits"
            label="Record Library Entry"
            icon="i-lucide-scan-line"
            color="success"
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
      </div>
    </section>

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
          class="group rounded-2xl border border-default bg-default p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-success/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
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
      <UCard class="rounded-2xl">
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
            class="group flex items-start gap-4 rounded-2xl border border-default bg-elevated/50 p-4 transition hover:border-success/40 hover:bg-success/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
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

      <UCard class="rounded-2xl">
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

    <UCard class="overflow-hidden rounded-2xl">
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
