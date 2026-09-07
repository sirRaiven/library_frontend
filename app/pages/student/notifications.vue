<script setup lang="ts">
import type {
  StudentNotification,
  StudentNotificationCategory,
  StudentNotificationFilters,
  StudentNotificationSeverity,
} from "~/composables/useStudentNotifications";

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

const filters =
  reactive<StudentNotificationFilters>({
    view: "unread",
    search: "",
    category: "all",
    severity: "all",
    page: 1,
    pageSize: 10,
  });

const searchInput =
  ref("");
const acting =
  ref<string | null>(null);
const markingAll =
  ref(false);
const lastUpdatedAt =
  ref<string | null>(null);

let refreshTimer:
  ReturnType<typeof setInterval> |
  null = null;

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

function applySearch() {
  filters.search =
    searchInput.value.trim();
  filters.page = 1;
  void load();
}

function reset() {
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

  void load();
}

watch(
  () => [
    filters.view,
    filters.category,
    filters.severity,
  ],
  () => {
    filters.page = 1;
    void load();
  },
);

watch(
  () => filters.page,
  () => {
    void load();
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
    class="sncbt-page-shell space-y-6"
  >
    <StudentPageHeader
      eyebrow="Messages and Reminders"
      title="Notifications"
      description="Review Library updates. Selecting a notification automatically marks it as read and updates the unread counter."
      icon="i-lucide-bell"
    >
      <template #actions>
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
          :loading="center.loading.value"
          @click="refresh"
        />
      </template>
    </StudentPageHeader>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-radio"
      title="Live Library updates"
      :description="`This page checks for new notices every 2 minutes while open. Last updated: ${lastUpdatedLabel}.`"
    />

    <UAlert
      v-if="center.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Notifications unavailable"
      :description="center.error.value"
    />

    <div
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StudentMetricCard
        v-for="item in metrics"
        :key="item.label"
        v-bind="item"
      />
    </div>

    <UCard>
      <div class="space-y-4">
        <div
          class="flex flex-wrap gap-2"
        >
          <UButton
            v-for="item in views"
            :key="item.value"
            :label="item.label"
            :icon="item.icon"
            :color="
              filters.view ===
              item.value
                ? 'primary'
                : 'neutral'
            "
            :variant="
              filters.view ===
              item.value
                ? 'solid'
                : 'outline'
            "
            size="sm"
            @click="
              filters.view =
                item.value
            "
          />
        </div>

        <div
          class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_11rem_auto]"
        >
          <UInput
            v-model="searchInput"
            icon="i-lucide-search"
            placeholder="Search a book title, reservation, borrowing, return, or message"
            @keyup.enter="applySearch"
          />

          <USelect
            v-model="filters.category"
            :items="
              categories.map(
                (value) => ({
                  label:
                    value === 'all'
                      ? 'All categories'
                      : value,
                  value,
                }),
              )
            "
          />

          <USelect
            v-model="filters.severity"
            :items="
              severities.map(
                (value) => ({
                  label:
                    value === 'all'
                      ? 'All severity levels'
                      : value,
                  value,
                }),
              )
            "
          />

          <div class="flex gap-2">
            <UButton
              label="Search"
              icon="i-lucide-search"
              @click="applySearch"
            />

            <UButton
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="outline"
              aria-label="Reset notification filters"
              @click="reset"
            />
          </div>
        </div>
      </div>
    </UCard>

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
      class="mb-12"
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
      class="space-y-3 mb-12"
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
      class="flex justify-center mb-12"
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
