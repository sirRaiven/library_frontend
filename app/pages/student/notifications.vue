<script setup lang="ts">
import type {
  StudentNotification,
  StudentNotificationCategory,
  StudentNotificationFilters,
  StudentNotificationSeverity,
} from "~/composables/useStudentNotifications";
import AppFilterBar from "~/components/shared/AppFilterBar.vue";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "Notifications",
  roleTitle: "Student",
});

const center =
  useStudentNotifications();
const auth =
  useAuth();
const toast =
  useToast();
const route =
  useRoute();
const router =
  useRouter();

const allowedViews: StudentNotificationFilters["view"][] = ["active", "unread", "read", "all"];
const allowedCategories: StudentNotificationFilters["category"][] = [
  "all",
  "Circulation",
  "Reservation",
  "Membership",
  "Library Card",
  "Announcement",
  "Security",
  "System",
];
const allowedSeverities: StudentNotificationFilters["severity"][] = [
  "all",
  "Critical",
  "Warning",
  "Info",
  "Success",
];

function queryText(name: string, maxLength = 120) {
  const value = route.query[name];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function queryChoice<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = route.query[name];
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

const filters =
  reactive<StudentNotificationFilters>({
    view: queryChoice("view", allowedViews, "unread"),
    search: queryText("search"),
    category: queryChoice("category", allowedCategories, "all"),
    severity: queryChoice("severity", allowedSeverities, "all"),
    page: Math.max(1, Number(route.query.page) || 1),
    pageSize: 10,
  });

const searchInput =
  ref(filters.search);
const acting =
  ref<string | null>(null);
const markingAll =
  ref(false);
const lastUpdatedAt =
  ref<string | null>(null);

let refreshTimer: number | null = null;

const views = [
  {
    label: "Unread",
    value: "unread",
    icon: "i-lucide-mail",
  },
  {
    label: "Active",
    value: "active",
    icon: "i-lucide-bell-ring",
  },
  {
    label: "Read",
    value: "read",
    icon: "i-lucide-mail-check",
  },
  {
    label: "All",
    value: "all",
    icon: "i-lucide-list-filter",
  },
] as const;

const categories = [
  "all",
  "Circulation",
  "Reservation",
  "Membership",
  "Library Card",
  "Announcement",
  "Security",
  "System",
] as const;

const severities = [
  "all",
  "Critical",
  "Warning",
  "Info",
  "Success",
] as const;

const metrics = computed(
  () => [
    {
      label: "Unread",
      value:
        center.summary.value.unread,
      icon: "i-lucide-mail",
      description:
        "New notices not yet reviewed",
    },
    {
      label: "Active Notices",
      value:
        center.summary.value.active,
      icon:
        "i-lucide-bell-ring",
      description:
        "Current Library messages and reminders",
    },
    {
      label: "Critical",
      value:
        center.summary.value.critical,
      icon:
        "i-lucide-octagon-alert",
      description:
        "Urgent Library concerns",
    },
    {
      label: "Announcements",
      value:
        center.summary.value.announcements,
      icon:
        "i-lucide-megaphone",
      description:
        "Current Library announcements",
    },
  ],
);

const lastUpdatedLabel = computed(
  () => {
    if (!lastUpdatedAt.value) {
      return "Waiting for the first update";
    }

    return new Intl.DateTimeFormat(
      "en-PH",
      {
        timeStyle: "short",
        timeZone: "Asia/Manila",
      },
    ).format(
      new Date(lastUpdatedAt.value),
    );
  },
);

const resultAnnouncement = computed(() => {
  if (center.loading.value) return "Loading notifications.";
  const total = center.pagination.value.total;
  return `${total} notification${total === 1 ? "" : "s"} shown.`;
});

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.view !== "unread") query.view = filters.view;
  if (filters.search) query.search = filters.search;
  if (filters.category !== "all") query.category = filters.category;
  if (filters.severity !== "all") query.severity = filters.severity;
  if (filters.page > 1) query.page = String(filters.page);
  await router.replace({ query });
}

async function load(
  synchronize = false,
) {
  try {
    if (synchronize) {
      // Sync already returns and stores the summary, so avoid fetching it twice.
      await center.sync();
      await center.load(filters);
    } else {
      await Promise.all([
        center.load(filters),
        center.loadSummary(),
      ]);
    }

    lastUpdatedAt.value =
      new Date().toISOString();
  } catch (error) {
    toast.add({
      title:
        "Notifications could not be loaded",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  }
}

async function refresh() {
  try {
    await load(true);

    filters.page = 1;

    toast.add({
      title:
        "Notifications refreshed",
      description:
        "Borrowing, return, reservation, and membership notices are up to date.",
      color: "success",
      icon:
        "i-lucide-refresh-cw",
    });
  } catch {
    // load() already displays the error.
  }
}

async function setRead(
  notification:
    StudentNotification,
  value: boolean,
) {
  acting.value =
    notification.documentId;

  try {
    await center.setRead(
      notification.documentId,
      value,
    );

    if (
      (filters.view === "unread" &&
        value) ||
      (filters.view === "read" &&
        !value)
    ) {
      await center.load(filters);
    }
  } finally {
    acting.value = null;
  }
}

async function openNotification(
  notification:
    StudentNotification,
) {
  if (!notification.isRead) {
    await setRead(
      notification,
      true,
    );
  }
}

async function markAllRead() {
  markingAll.value = true;

  try {
    await center.markAllRead();
    await center.load(filters);

    toast.add({
      title:
        "Notifications marked as read",
      color: "success",
      icon:
        "i-lucide-mail-check",
    });
  } finally {
    markingAll.value = false;
  }
}

async function applySearch() {
  filters.search =
    searchInput.value.trim();
  filters.page = 1;
  await syncRouteQuery();
  await load();
}

async function reset() {
  searchInput.value = "";

  Object.assign(
    filters,
    {
      view: "unread",
      search: "",
      category: "all",
      severity: "all",
      page: 1,
    },
  );

  await syncRouteQuery();
  await load();
}

watch(
  () => [
    filters.view,
    filters.category,
    filters.severity,
  ],
  async () => {
    filters.page = 1;
    await syncRouteQuery();
    await load();
  },
);

watch(
  () => filters.page,
  async () => {
    await syncRouteQuery();
    await load();
  },
);

onMounted(async () => {
  await load(true);

  refreshTimer =
    window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void load();
        }
      },
      120_000,
    );
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(
      refreshTimer,
    );
    refreshTimer = null;
  }
});
</script>

<template>
  <div
    class="sncbt-page-shell sncbt-member-page space-y-6"
  >
    <StudentPageHeader
      eyebrow="Messages and Reminders"
      title="Notifications"
      description="Review Library updates. Selecting a notification automatically marks it as read and updates the unread counter."
      icon="i-lucide-bell"
    >
      <template #actions>
        <UBadge
          v-if="center.badgeCount.value > 0"
          :label="`${center.chipText.value} unread`"
          color="error"
          variant="soft"
          size="lg"
          icon="i-lucide-bell-dot"
          :aria-label="`${center.badgeCount.value} unread notification${center.badgeCount.value === 1 ? '' : 's'}`"
        />

        <UButton
          label="Mark All Read"
          icon="i-lucide-mail-check"
          color="neutral"
          variant="outline"
          :disabled="
            center.summary.value.unread === 0
          "
          :loading="markingAll"
          @click="markAllRead"
        />

        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="primary"
          class="hidden sm:inline-flex"
          :loading="center.loading.value"
          @click="refresh"
        />
      </template>
    </StudentPageHeader>

    <UAlert
      v-if="center.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Notifications unavailable"
      :description="center.error.value"
    />

    <div
      class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
    >
      <StudentMetricCard
        v-for="item in metrics"
        :key="item.label"
        v-bind="item"
      />
    </div>

    <AppFilterBar
      title="Notification center"
      :description="`Updates automatically while this page is open. Last updated: ${lastUpdatedLabel}.`"
      :active-count="(filters.view !== 'unread' ? 1 : 0) + (filters.category !== 'all' ? 1 : 0) + (filters.severity !== 'all' ? 1 : 0) + (filters.search ? 1 : 0)"
    >
      <template #quick>
        <UButton
          v-for="item in views"
          :key="item.value"
          :label="item.label"
          :icon="item.icon"
          :color="filters.view === item.value ? 'primary' : 'neutral'"
          :variant="filters.view === item.value ? 'solid' : 'ghost'"
          :aria-pressed="filters.view === item.value"
          size="sm"
          @click="() => { filters.view = item.value; }"
        />
      </template>

      <template #search>
        <UInput
          v-model="searchInput"
          icon="i-lucide-search"
          placeholder="Search notifications"
          aria-label="Search Student notifications"
          class="w-full"
          @keyup.enter="applySearch"
        />
      </template>

      <template #filters>
        <USelect
          v-model="filters.category"
          :items="categories.map((value) => ({ label: value === 'all' ? 'All categories' : value, value }))"
          aria-label="Notification category"
          class="w-full md:w-52"
        />
        <USelect
          v-model="filters.severity"
          :items="severities.map((value) => ({ label: value === 'all' ? 'All severity levels' : value, value }))"
          aria-label="Notification severity"
          class="w-full md:w-48"
        />
      </template>

      <template #actions>
        <UButton label="Search" icon="i-lucide-search" @click="applySearch" />
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          aria-label="Reset notification filters"
          @click="reset"
        />
      </template>
    </AppFilterBar>

    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ resultAnnouncement }}</p>

    <div
      v-if="
        center.loading.value &&
        !center.notifications.value.length
      "
      class="space-y-3"
    >
      <USkeleton
        v-for="number in 4"
        :key="number"
        class="h-40 rounded-2xl"
      />
    </div>

    <UCard
      v-else-if="
        !center.notifications.value.length
      "
     
    >
      <div class="py-12 text-center">
        <div
          class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted"
        >
          <UIcon
            name="i-lucide-bell-off"
            class="size-7"
          />
        </div>

        <h2
          class="mt-4 text-lg font-semibold text-highlighted"
        >
          No notifications found
        </h2>

        <p
          class="mt-2 text-sm text-muted"
        >
          New reservation, borrowing, and return updates will appear here automatically.
        </p>
      </div>
    </UCard>

    <div
      v-else
      class="space-y-3"
    >
      <StudentNotificationCard
        v-for="
          notification in
          center.notifications.value
        "
        :key="
          notification.documentId
        "
        :notification="
          notification
        "
        :busy="
          acting ===
          notification.documentId
        "
        @read="
          (value) =>
            setRead(
              notification,
              value,
            )
        "
        @open="
          openNotification(
            notification,
          )
        "
      />
    </div>

    <div
      v-if="
        center.pagination.value.pageCount >
        1
      "
      class="flex justify-center"
    >
      <UPagination
        v-model:page="filters.page"
        :total="
          center.pagination.value.total
        "
        :items-per-page="
          center.pagination.value.pageSize
        "
      />
    </div>
  </div>
</template>
