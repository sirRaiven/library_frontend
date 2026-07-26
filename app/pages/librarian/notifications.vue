
<script setup lang="ts">
import type {
  LibraryNotification,
  NotificationCategory,
  NotificationFilters,
  NotificationSeverity,
} from "~/composables/useLibraryNotifications";

definePageMeta({
  layout: "librarian",
  title:
    "Notifications",
});

const notificationCenter =
  useLibraryNotifications();
const auth = useAuth();
const toast = useToast();

const filters =
  reactive<NotificationFilters>({
    view: "attention",
    search: "",
    category: "all",
    severity: "all",
    page: 1,
    pageSize: 10,
  });

const searchInput = ref("");
const selectedNotification =
  ref<LibraryNotification | null>(
    null,
  );
const isDetailsOpen = ref(false);
const isMarkingAll = ref(false);
const actingDocumentId =
  ref<string | null>(null);

const viewOptions = [
  {
    value: "attention",
    label: "Needs Attention",
    icon:
      "i-lucide-triangle-alert",
  },
  {
    value: "unread",
    label: "Unread",
    icon:
      "i-lucide-mail",
  },
  {
    value: "active",
    label: "Active",
    icon:
      "i-lucide-bell-ring",
  },
  {
    value: "all",
    label: "All",
    icon:
      "i-lucide-list-filter",
  },
  {
    value: "resolved",
    label: "Resolved",
    icon:
      "i-lucide-circle-check",
  },
] as const;

const categoryOptions = [
  "Circulation",
  "Reservation",
  "Membership",
  "Library Card",
  "Inventory",
  "System",
] satisfies NotificationCategory[];

const severityOptions = [
  "Critical",
  "Warning",
  "Info",
  "Success",
] satisfies NotificationSeverity[];

const severityStyles:
  Record<
    NotificationSeverity,
    {
      badge:
        | "error"
        | "warning"
        | "info"
        | "success";
      icon: string;
      iconClass: string;
      borderClass: string;
    }
  > = {
    Critical: {
      badge: "error",
      icon:
        "i-lucide-octagon-alert",
      iconClass:
        "bg-error/10 text-error",
      borderClass:
        "border-error/40",
    },
    Warning: {
      badge: "warning",
      icon:
        "i-lucide-triangle-alert",
      iconClass:
        "bg-warning/10 text-warning",
      borderClass:
        "border-warning/40",
    },
    Info: {
      badge: "info",
      icon:
        "i-lucide-info",
      iconClass:
        "bg-info/10 text-info",
      borderClass:
        "border-info/30",
    },
    Success: {
      badge: "success",
      icon:
        "i-lucide-circle-check",
      iconClass:
        "bg-success/10 text-success",
      borderClass:
        "border-success/30",
    },
  };

const categoryIcons:
  Record<
    NotificationCategory,
    string
  > = {
    Circulation:
      "i-lucide-book-open-check",
    Reservation:
      "i-lucide-calendar-clock",
    Membership:
      "i-lucide-user-round-check",
    "Library Card":
      "i-lucide-id-card",
    Inventory:
      "i-lucide-library",
    System:
      "i-lucide-server-cog",
  };

const summaryCards = computed(
  () => [
    {
      label:
        "Needs Attention",
      value:
        notificationCenter
          .summary.value
          .attentionRequired,
      icon:
        "i-lucide-triangle-alert",
      class:
        "text-warning",
      description:
        "Active items requiring Librarian action",
    },
    {
      label:
        "Critical",
      value:
        notificationCenter
          .summary.value
          .critical,
      icon:
        "i-lucide-octagon-alert",
      class:
        "text-error",
      description:
        "Urgent operational concerns",
    },
    {
      label:
        "Unread",
      value:
        notificationCenter
          .summary.value.unread,
      icon:
        "i-lucide-mail",
      class:
        "text-primary",
      description:
        "Notifications not yet reviewed",
    },
    {
      label:
        "Active Alerts",
      value:
        notificationCenter
          .summary.value
          .totalActive,
      icon:
        "i-lucide-bell-ring",
      class:
        "text-success",
      description:
        "Current alerts across all modules",
    },
  ],
);

const displayedNotifications =
  computed(
    () =>
      notificationCenter
        .notifications.value,
  );

const pagination = computed(
  () =>
    notificationCenter
      .pagination.value,
);

const activeViewLabel = computed(
  () =>
    viewOptions.find(
      (item) =>
        item.value ===
        filters.view,
    )?.label ??
    "Notifications",
);

let searchTimer:
  ReturnType<typeof setTimeout> |
  null = null;

async function loadPage(
  sync = false,
) {
  try {
    if (sync) {
      await notificationCenter
        .syncNotifications();
    }

    await Promise.all([
      notificationCenter
        .loadNotifications(
          filters,
        ),
      notificationCenter
        .loadSummary(false),
    ]);
  } catch (error) {
    toast.add({
      title:
        "Notifications could not be loaded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  }
}

async function refreshNotifications() {
  try {
    const result =
      await notificationCenter
        .syncNotifications();

    filters.page = 1;

    await notificationCenter
      .loadNotifications(
        filters,
      );

    toast.add({
      title:
        "Notifications refreshed",
      description:
        `${result?.created ?? 0} new, ${result?.updated ?? 0} updated, and ${result?.resolved ?? 0} resolved.`,
      color: "success",
      icon:
        "i-lucide-refresh-cw",
    });
  } catch (error) {
    toast.add({
      title:
        "Refresh failed",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  }
}

async function toggleRead(
  notification:
    LibraryNotification,
) {
  actingDocumentId.value =
    notification.documentId;

  try {
    await notificationCenter
      .updateReadState(
        notification.documentId,
        !notification.isRead,
      );

    if (
      filters.view ===
        "unread" &&
      !notification.isRead
    ) {
      await notificationCenter
        .loadNotifications(
          filters,
        );
    }
  } catch (error) {
    toast.add({
      title:
        "Notification could not be updated",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    actingDocumentId.value =
      null;
  }
}

async function markAllRead() {
  if (
    notificationCenter
      .summary.value.unread ===
    0
  ) {
    return;
  }

  isMarkingAll.value = true;

  try {
    const result =
      await notificationCenter
        .markAllRead();

    if (
      filters.view ===
      "unread"
    ) {
      await notificationCenter
        .loadNotifications(
          filters,
        );
    }

    toast.add({
      title:
        "Notifications marked as read",
      description:
        `${result.updated} active notification${
          result.updated === 1
            ? ""
            : "s"
        } updated.`,
      color: "success",
      icon:
        "i-lucide-check-check",
    });
  } catch (error) {
    toast.add({
      title:
        "Unable to mark all as read",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    isMarkingAll.value =
      false;
  }
}

async function dismissNotification(
  notification:
    LibraryNotification,
) {
  actingDocumentId.value =
    notification.documentId;

  try {
    await notificationCenter
      .dismiss(
        notification.documentId,
      );

    toast.add({
      title:
        "Notification dismissed",
      description:
        "The alert was removed from the active list. It can still be reviewed under All.",
      color: "success",
      icon:
        "i-lucide-archive",
    });

    await notificationCenter
      .loadNotifications(
        filters,
      );
  } catch (error) {
    toast.add({
      title:
        "Notification could not be dismissed",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    actingDocumentId.value =
      null;
  }
}

async function openNotification(
  notification:
    LibraryNotification,
) {
  selectedNotification.value =
    notification;
  isDetailsOpen.value = true;

  if (!notification.isRead) {
    await toggleRead(
      notification,
    );
  }
}

async function openAction(
  notification:
    LibraryNotification,
) {
  if (!notification.isRead) {
    await notificationCenter
      .updateReadState(
        notification.documentId,
        true,
      );
  }

  if (
    notification.actionUrl
  ) {
    await navigateTo(
      notification.actionUrl,
    );
  }
}

function severityFor(
  notification:
    LibraryNotification,
) {
  return severityStyles[
    notification.severity
  ];
}

function formatDateTime(
  value?: string,
) {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone:
          "Asia/Manila",
      },
    )
    .format(
      new Date(value),
    );
}

function relativeTime(
  value?: string,
) {
  if (!value) {
    return "Unknown time";
  }

  const date =
    new Date(value);
  const difference =
    date.getTime() -
    Date.now();
  const absolute =
    Math.abs(difference);

  const units = [
    {
      unit:
        "day" as const,
      milliseconds:
        86_400_000,
    },
    {
      unit:
        "hour" as const,
      milliseconds:
        3_600_000,
    },
    {
      unit:
        "minute" as const,
      milliseconds:
        60_000,
    },
  ];

  const formatter =
    new Intl.RelativeTimeFormat(
      "en",
      {
        numeric: "auto",
      },
    );

  for (
    const item of units
  ) {
    if (
      absolute >=
      item.milliseconds
    ) {
      return formatter.format(
        Math.round(
          difference /
            item.milliseconds,
        ),
        item.unit,
      );
    }
  }

  return "just now";
}

watch(
  searchInput,
  (value) => {
    if (searchTimer) {
      clearTimeout(
        searchTimer,
      );
    }

    searchTimer =
      setTimeout(
        () => {
          filters.search =
            value.trim();
          filters.page = 1;
          void loadPage();
        },
        350,
      );
  },
);

watch(
  () => [
    filters.view,
    filters.category,
    filters.severity,
    filters.page,
  ],
  () => {
    void loadPage();
  },
);

onMounted(() => {
  notificationCenter
    .startPolling();

  void loadPage(true);
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div
      class="mx-auto max-w-7xl space-y-6"
    >
      <header
        class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
      >
        <div
          class="flex items-start gap-3"
        >
          <div
            class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning"
          >
            <UIcon
              name="i-lucide-bell-ring"
              class="size-6"
            />
          </div>

          <div>
            <div
              class="flex flex-wrap items-center gap-2"
            >
              <h1
                class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
              >
                Notification
              </h1>

              <UBadge
                v-if="
                  notificationCenter
                    .badgeCount.value > 0
                "
                :color="
                  notificationCenter
                    .hasCritical.value
                    ? 'error'
                    : 'warning'
                "
                variant="soft"
              >
                {{
                  notificationCenter
                    .badgeCount.value
                }}
                needs review
              </UBadge>
            </div>

            <p
              class="mt-1 max-w-3xl text-sm leading-relaxed text-muted"
            >
              Review overdue loans, expiring reservations and memberships, Library Card processing, and damaged or lost inventory.
            </p>
          </div>
        </div>

        <div
          class="flex flex-wrap gap-2"
        >
          <UButton
            label="Mark All Read"
            icon="i-lucide-check-check"
            color="neutral"
            variant="outline"
            :loading="isMarkingAll"
            :disabled="
              notificationCenter
                .summary.value.unread ===
              0
            "
            @click="markAllRead"
          />

          <UButton
            label="Refresh Alerts"
            icon="i-lucide-refresh-cw"
            color="success"
            :loading="
              notificationCenter
                .isSyncing.value
            "
            @click="
              refreshNotifications
            "
          />
        </div>
      </header>

      <section
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <UCard
          v-for="
            card in summaryCards
          "
          :key="card.label"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p
                class="text-sm text-muted"
              >
                {{ card.label }}
              </p>

              <p
                class="mt-2 text-3xl font-bold text-highlighted"
              >
                {{ card.value }}
              </p>

              <p
                class="mt-1 text-xs leading-relaxed text-muted"
              >
                {{
                  card.description
                }}
              </p>
            </div>

            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated"
              :class="card.class"
            >
              <UIcon
                :name="card.icon"
                class="size-5"
              />
            </div>
          </div>
        </UCard>
      </section>

      <UCard>
        <template #header>
          <div
            class="space-y-4"
          >
            <div
              class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <h2
                  class="font-semibold text-highlighted"
                >
                  {{
                    activeViewLabel
                  }}
                </h2>

                <p
                  class="mt-1 text-sm text-muted"
                >
                  {{
                    pagination.total
                  }}
                  matching notification{{
                    pagination.total ===
                    1
                      ? ""
                      : "s"
                  }}
                </p>
              </div>

              <div
                class="flex flex-wrap gap-2"
              >
                <UButton
                  v-for="
                    option in viewOptions
                  "
                  :key="
                    option.value
                  "
                  :label="
                    option.label
                  "
                  :icon="
                    option.icon
                  "
                  :color="
                    filters.view ===
                    option.value
                      ? 'success'
                      : 'neutral'
                  "
                  :variant="
                    filters.view ===
                    option.value
                      ? 'soft'
                      : 'ghost'
                  "
                  size="sm"
                  @click="
                    () => {
                      filters.view =
                        option.value;
                      filters.page = 1;
                    }
                  "
                />
              </div>
            </div>

            <div
              class="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_11rem]"
            >
              <UInput
                v-model="
                  searchInput
                "
                icon="i-lucide-search"
                placeholder="Search title, message, member, book, or reference"
                class="w-full"
              />

              <USelect
                v-model="
                  filters.category
                "
                :items="[
                  {
                    label:
                      'All Categories',
                    value: 'all',
                  },
                  ...categoryOptions.map(
                    (value) => ({
                      label: value,
                      value,
                    }),
                  ),
                ]"
                value-key="value"
                label-key="label"
                icon="i-lucide-tags"
                class="w-full"
                @update:model-value="
                  filters.page = 1
                "
              />

              <USelect
                v-model="
                  filters.severity
                "
                :items="[
                  {
                    label:
                      'All Priorities',
                    value: 'all',
                  },
                  ...severityOptions.map(
                    (value) => ({
                      label: value,
                      value,
                    }),
                  ),
                ]"
                value-key="value"
                label-key="label"
                icon="i-lucide-shield-alert"
                class="w-full"
                @update:model-value="
                  filters.page = 1
                "
              />
            </div>
          </div>
        </template>

        <div
          v-if="
            notificationCenter
              .isLoadingList.value
          "
          class="space-y-3"
        >
          <USkeleton
            v-for="item in 5"
            :key="item"
            class="h-32 w-full rounded-2xl"
          />
        </div>

        <div
          v-else-if="
            displayedNotifications
              .length === 0
          "
          class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-elevated/20 p-8 text-center"
        >
          <div
            class="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success"
          >
            <UIcon
              name="i-lucide-bell-off"
              class="size-7"
            />
          </div>

          <p
            class="mt-4 font-semibold text-highlighted"
          >
            No matching notifications
          </p>

          <p
            class="mt-1 max-w-lg text-sm text-muted"
          >
            There are no alerts in this view. Refresh the Notification Center to check the latest Library records.
          </p>
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <article
            v-for="
              notification in displayedNotifications
            "
            :key="
              notification.documentId
            "
            class="rounded-2xl border bg-default p-4 transition hover:bg-elevated/30 sm:p-5"
            :class="[
              severityFor(
                notification,
              ).borderClass,
              !notification.isRead
                ? 'shadow-sm'
                : 'opacity-90',
            ]"
          >
            <div
              class="flex items-start gap-4"
            >
              <button
                type="button"
                class="flex size-11 shrink-0 items-center justify-center rounded-xl"
                :class="
                  severityFor(
                    notification,
                  ).iconClass
                "
                :aria-label="`Open ${notification.title}`"
                @click="
                  openNotification(
                    notification,
                  )
                "
              >
                <UIcon
                  :name="
                    categoryIcons[
                      notification
                        .category
                    ] ||
                    severityFor(
                      notification,
                    ).icon
                  "
                  class="size-5"
                />
              </button>

              <div
                class="min-w-0 flex-1"
              >
                <div
                  class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                >
                  <button
                    type="button"
                    class="min-w-0 text-left"
                    @click="
                      openNotification(
                        notification,
                      )
                    "
                  >
                    <div
                      class="flex flex-wrap items-center gap-2"
                    >
                      <h3
                        class="font-semibold text-highlighted"
                      >
                        {{
                          notification.title
                        }}
                      </h3>

                      <span
                        v-if="
                          !notification.isRead
                        "
                        class="size-2 rounded-full bg-primary"
                        aria-label="Unread"
                      />

                      <UBadge
                        :color="
                          severityFor(
                            notification,
                          ).badge
                        "
                        variant="soft"
                        size="sm"
                      >
                        {{
                          notification.severity
                        }}
                      </UBadge>

                      <UBadge
                        color="neutral"
                        variant="outline"
                        size="sm"
                      >
                        {{
                          notification.category
                        }}
                      </UBadge>

                      <UBadge
                        v-if="
                          notification.requiresAction
                        "
                        color="warning"
                        variant="solid"
                        size="sm"
                      >
                        Action Needed
                      </UBadge>
                    </div>

                    <p
                      class="mt-2 line-clamp-2 text-sm leading-relaxed text-muted"
                    >
                      {{
                        notification.message
                      }}
                    </p>
                  </button>

                  <div
                    class="flex shrink-0 items-center gap-2"
                  >
                    <span
                      class="whitespace-nowrap text-xs text-dimmed"
                      :title="
                        formatDateTime(
                          notification.occurredAt,
                        )
                      "
                    >
                      {{
                        relativeTime(
                          notification.occurredAt,
                        )
                      }}
                    </span>

                    <UDropdownMenu
                      :items="[
                        [
                          {
                            label:
                              notification.isRead
                                ? 'Mark as unread'
                                : 'Mark as read',
                            icon:
                              notification.isRead
                                ? 'i-lucide-mail'
                                : 'i-lucide-mail-open',
                            onSelect() {
                              void toggleRead(
                                notification,
                              );
                            },
                          },
                          {
                            label:
                              'View details',
                            icon:
                              'i-lucide-eye',
                            onSelect() {
                              void openNotification(
                                notification,
                              );
                            },
                          },
                        ],
                        [
                          {
                            label:
                              'Dismiss',
                            icon:
                              'i-lucide-archive',
                            color:
                              'error',
                            onSelect() {
                              void dismissNotification(
                                notification,
                              );
                            },
                          },
                        ],
                      ]"
                    >
                      <UButton
                        icon="i-lucide-ellipsis"
                        color="neutral"
                        variant="ghost"
                        square
                        :loading="
                          actingDocumentId ===
                          notification.documentId
                        "
                        aria-label="Notification actions"
                      />
                    </UDropdownMenu>
                  </div>
                </div>

                <div
                  class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div
                    class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted"
                  >
                    <span
                      v-if="
                        notification.sourceType
                      "
                      class="inline-flex items-center gap-1.5"
                    >
                      <UIcon
                        name="i-lucide-database"
                        class="size-3.5"
                      />
                      {{
                        notification.sourceType
                      }}
                    </span>

                    <span
                      v-if="
                        notification.expiresAt
                      "
                      class="inline-flex items-center gap-1.5"
                    >
                      <UIcon
                        name="i-lucide-calendar-clock"
                        class="size-3.5"
                      />
                      Expires
                      {{
                        formatDateTime(
                          notification.expiresAt,
                        )
                      }}
                    </span>
                  </div>

                  <UButton
                    v-if="
                      notification.actionUrl
                    "
                    :label="
                      notification.actionLabel ||
                      'Review Record'
                    "
                    icon="i-lucide-arrow-up-right"
                    color="success"
                    variant="soft"
                    size="sm"
                    @click="
                      openAction(
                        notification,
                      )
                    "
                  />
                </div>
              </div>
            </div>
          </article>
        </div>

        <template #footer>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p
              class="text-sm text-muted"
            >
              Page
              {{
                pagination.page
              }}
              of
              {{
                Math.max(
                  pagination.pageCount,
                  1,
                )
              }}
              ·
              {{
                pagination.total
              }}
              record{{
                pagination.total ===
                1
                  ? ""
                  : "s"
              }}
            </p>

            <UPagination
              v-if="
                pagination.pageCount >
                1
              "
              v-model:page="
                filters.page
              "
              :total="
                pagination.total
              "
              :items-per-page="
                pagination.pageSize
              "
              :sibling-count="1"
              show-edges
            />
          </div>
        </template>
      </UCard>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-shield-check"
        title="Automatic operational alerts"
        description="The Notification Center checks current Library records. Alerts resolve automatically after the related loan, reservation, membership, card, or inventory concern is corrected."
      />
    </div>
  </UContainer>

  <UModal
    v-model:open="
      isDetailsOpen
    "
    :ui="{
      content:
        'sm:max-w-2xl',
    }"
  >
    <template #content>
      <div
        v-if="
          selectedNotification
        "
        class="bg-default p-6 sm:p-8"
      >
        <div
          class="flex items-start gap-4"
        >
          <div
            class="flex size-12 shrink-0 items-center justify-center rounded-2xl"
            :class="
              severityFor(
                selectedNotification,
              ).iconClass
            "
          >
            <UIcon
              :name="
                categoryIcons[
                  selectedNotification
                    .category
                ] ||
                severityFor(
                  selectedNotification,
                ).icon
              "
              class="size-6"
            />
          </div>

          <div
            class="min-w-0 flex-1"
          >
            <div
              class="flex flex-wrap items-center gap-2"
            >
              <UBadge
                :color="
                  severityFor(
                    selectedNotification,
                  ).badge
                "
                variant="soft"
              >
                {{
                  selectedNotification
                    .severity
                }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="outline"
              >
                {{
                  selectedNotification
                    .category
                }}
              </UBadge>
            </div>

            <h2
              class="mt-3 text-xl font-bold text-highlighted"
            >
              {{
                selectedNotification
                  .title
              }}
            </h2>
          </div>
        </div>

        <p
          class="mt-5 whitespace-pre-line text-sm leading-7 text-muted"
        >
          {{
            selectedNotification
              .message
          }}
        </p>

        <dl
          class="mt-6 grid gap-4 rounded-2xl border border-default bg-elevated/30 p-4 sm:grid-cols-2"
        >
          <div>
            <dt
              class="text-xs text-muted"
            >
              Created
            </dt>
            <dd
              class="mt-1 text-sm font-medium text-highlighted"
            >
              {{
                formatDateTime(
                  selectedNotification
                    .occurredAt,
                )
              }}
            </dd>
          </div>

          <div>
            <dt
              class="text-xs text-muted"
            >
              Status
            </dt>
            <dd
              class="mt-1 text-sm font-medium text-highlighted"
            >
              {{
                selectedNotification
                  .status
              }}
            </dd>
          </div>

          <div
            v-if="
              selectedNotification
                .sourceType
            "
          >
            <dt
              class="text-xs text-muted"
            >
              Source
            </dt>
            <dd
              class="mt-1 text-sm font-medium text-highlighted"
            >
              {{
                selectedNotification
                  .sourceType
              }}
            </dd>
          </div>

          <div
            v-if="
              selectedNotification
                .sourceDocumentId
            "
          >
            <dt
              class="text-xs text-muted"
            >
              Record ID
            </dt>
            <dd
              class="mt-1 break-all font-mono text-xs text-highlighted"
            >
              {{
                selectedNotification
                  .sourceDocumentId
              }}
            </dd>
          </div>
        </dl>

        <div
          class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <UButton
            label="Close"
            color="neutral"
            variant="outline"
            @click="
              isDetailsOpen = false
            "
          />

          <UButton
            v-if="
              selectedNotification
                .actionUrl
            "
            :label="
              selectedNotification
                .actionLabel ||
              'Review Record'
            "
            icon="i-lucide-arrow-up-right"
            color="success"
            @click="
              openAction(
                selectedNotification,
              )
            "
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
