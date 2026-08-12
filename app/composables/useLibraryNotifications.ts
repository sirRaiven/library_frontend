export type NotificationSeverity =
  | "Info"
  | "Success"
  | "Warning"
  | "Critical";

export type NotificationCategory =
  | "Circulation"
  | "Reservation"
  | "Membership"
  | "Library Card"
  | "Inventory"
  | "System";

export type NotificationStatus =
  | "Active"
  | "Resolved"
  | "Dismissed";

export interface LibraryNotification {
  documentId: string;
  notificationKey?: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  status: NotificationStatus;
  isRead: boolean;
  requiresAction: boolean;
  actionLabel?: string;
  actionUrl?: string;
  sourceType?: string;
  sourceDocumentId?: string;
  occurredAt: string;
  expiresAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSummary {
  totalActive: number;
  unread: number;
  critical: number;
  warning: number;
  attentionRequired: number;
  resolved: number;
}

export interface NotificationFilters {
  view:
    | "unread"
    | "active"
    | "all"
    | "resolved";
  search: string;
  category:
    | NotificationCategory
    | "all";
  severity:
    | NotificationSeverity
    | "all";
  page: number;
  pageSize: number;
}

interface ListResponse {
  data: LibraryNotification[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

interface DataResponse<T> {
  data: T;
}

let pollingTimer:
  ReturnType<typeof setInterval> |
  null = null;

let visibilityHandler:
  (() => void) |
  null = null;

export function useLibraryNotifications() {
  const auth = useAuth();

  const summary =
    useState<NotificationSummary>(
      "library-notification-summary",
      () => ({
        totalActive: 0,
        unread: 0,
        critical: 0,
        warning: 0,
        attentionRequired: 0,
        resolved: 0,
      }),
    );

  const notifications =
    useState<LibraryNotification[]>(
      "library-notification-records",
      () => [],
    );

  const pagination =
    useState(
      "library-notification-pagination",
      () => ({
        page: 1,
        pageSize: 10,
        pageCount: 1,
        total: 0,
      }),
    );

  const isLoadingSummary =
    useState(
      "library-notification-summary-loading",
      () => false,
    );

  const isLoadingList =
    useState(
      "library-notification-list-loading",
      () => false,
    );

  const isSyncing =
    useState(
      "library-notification-syncing",
      () => false,
    );

  const lastUpdatedAt =
    useState<string | null>(
      "library-notification-last-updated",
      () => null,
    );

  // The navigation chip represents unread notifications only.
  // Action-required records remain visible inside the Notification Center,
  // but they no longer keep the global chip visible after being read.
  const badgeCount = computed(
    () => summary.value.unread,
  );

  const chipText = computed(
    () =>
      badgeCount.value > 99
        ? "99+"
        : String(badgeCount.value),
  );

  const chipColor = computed<
    "error" | "primary"
  >(() =>
    badgeCount.value > 0
      ? "error"
      : "primary",
  );

  const hasCritical = computed(
    () =>
      summary.value.critical > 0,
  );

  async function loadSummary(
    sync = true,
  ): Promise<NotificationSummary> {
    if (isLoadingSummary.value) {
      return summary.value;
    }

    isLoadingSummary.value = true;

    try {
      const response =
        await auth.authFetch<
          DataResponse<NotificationSummary>
        >(
          "/api/notification-center/summary",
          {
            method: "GET",
            cache: "no-store",
            query: {
              sync:
                sync
                  ? "true"
                  : "false",
              timestamp:
                Date.now(),
            },
          },
        );

      summary.value =
        response.data;
      lastUpdatedAt.value =
        new Date().toISOString();

      return response.data;
    } finally {
      isLoadingSummary.value =
        false;
    }
  }

  async function loadNotifications(
    filters: NotificationFilters,
  ): Promise<ListResponse> {
    isLoadingList.value = true;

    try {
      const response =
        await auth.authFetch<ListResponse>(
          "/api/notification-center",
          {
            method: "GET",
            cache: "no-store",
            query: {
              view:
                filters.view,
              search:
                filters.search ||
                undefined,
              category:
                filters.category !== "all"
                  ? filters.category
                  : undefined,
              severity:
                filters.severity !== "all"
                  ? filters.severity
                  : undefined,
              page:
                filters.page,
              pageSize:
                filters.pageSize,
              timestamp:
                Date.now(),
            },
          },
        );

      notifications.value =
        response.data;
      pagination.value =
        response.meta.pagination;
      lastUpdatedAt.value =
        new Date().toISOString();

      return response;
    } finally {
      isLoadingList.value =
        false;
    }
  }

  async function syncNotifications() {
    if (isSyncing.value) {
      return;
    }

    isSyncing.value = true;

    try {
      const response =
        await auth.authFetch<
          DataResponse<{
            created: number;
            updated: number;
            resolved: number;
            summary:
              NotificationSummary;
          }>
        >(
          "/api/notification-center/sync",
          {
            method: "POST",
          },
        );

      summary.value =
        response.data.summary;
      lastUpdatedAt.value =
        new Date().toISOString();

      return response.data;
    } finally {
      isSyncing.value =
        false;
    }
  }

  async function updateReadState(
    documentId: string,
    isRead: boolean,
  ) {
    const index =
      notifications.value.findIndex(
        (item) =>
          item.documentId ===
          documentId,
      );

    const previousNotification =
      index >= 0
        ? notifications.value[index]
        : undefined;
    const previousSummary = {
      ...summary.value,
    };

    // Update the visible card and global chip immediately. The authoritative
    // summary is still reloaded after the backend confirms the change.
    if (
      previousNotification &&
      previousNotification.isRead !== isRead
    ) {
      notifications.value[index] = {
        ...previousNotification,
        isRead,
      };

      summary.value = {
        ...summary.value,
        unread: Math.max(
          0,
          summary.value.unread +
            (isRead ? -1 : 1),
        ),
      };
    }

    try {
      const response =
        await auth.authFetch<
          DataResponse<LibraryNotification>
        >(
          `/api/notification-center/${encodeURIComponent(
            documentId,
          )}/${isRead ? "read" : "unread"}`,
          {
            method: "PATCH",
          },
        );

      if (index >= 0) {
        notifications.value[index] =
          response.data;
      }

      await loadSummary(false);

      return response.data;
    } catch (error) {
      if (
        index >= 0 &&
        previousNotification
      ) {
        notifications.value[index] =
          previousNotification;
      }

      summary.value = previousSummary;
      throw error;
    }
  }

  async function markAllRead() {
    const response =
      await auth.authFetch<
        DataResponse<{
          updated: number;
          summary:
            NotificationSummary;
        }>
      >(
        "/api/notification-center/read-all",
        {
          method: "PATCH",
        },
      );

    notifications.value =
      notifications.value.map(
        (item) => ({
          ...item,
          isRead: true,
        }),
      );

    summary.value =
      response.data.summary;

    return response.data;
  }

  async function dismiss(
    documentId: string,
  ) {
    const response =
      await auth.authFetch<
        DataResponse<LibraryNotification>
      >(
        `/api/notification-center/${encodeURIComponent(
          documentId,
        )}/dismiss`,
        {
          method: "PATCH",
        },
      );

    notifications.value =
      notifications.value.filter(
        (item) =>
          item.documentId !==
          documentId,
      );

    await loadSummary(false);

    return response.data;
  }

  function startPolling(
    intervalMilliseconds = 120_000,
  ) {
    if (!import.meta.client) {
      return;
    }

    void loadSummary(true);

    if (!pollingTimer) {
      pollingTimer =
        window.setInterval(
          () => {
            if (
              document.visibilityState ===
              "visible"
            ) {
              void loadSummary(true);
            }
          },
          intervalMilliseconds,
        );
    }

    if (!visibilityHandler) {
      visibilityHandler = () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadSummary(true);
        }
      };

      document.addEventListener(
        "visibilitychange",
        visibilityHandler,
      );
    }
  }

  function stopPolling() {
    if (!import.meta.client) {
      return;
    }

    if (pollingTimer) {
      window.clearInterval(
        pollingTimer,
      );
      pollingTimer = null;
    }

    if (visibilityHandler) {
      document.removeEventListener(
        "visibilitychange",
        visibilityHandler,
      );
      visibilityHandler = null;
    }
  }

  return {
    summary,
    notifications,
    pagination,
    isLoadingSummary,
    isLoadingList,
    isSyncing,
    lastUpdatedAt,
    badgeCount,
    chipText,
    chipColor,
    hasCritical,
    loadSummary,
    loadNotifications,
    syncNotifications,
    updateReadState,
    markAllRead,
    dismiss,
    startPolling,
    stopPolling,
  };
}
