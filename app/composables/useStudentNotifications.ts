export type StudentNotificationCategory =
  | "Circulation"
  | "Reservation"
  | "Membership"
  | "Library Card"
  | "Announcement"
  | "Security"
  | "System";

export type StudentNotificationSeverity =
  | "Info"
  | "Success"
  | "Warning"
  | "Critical";

export interface StudentNotification {
  documentId: string;
  title: string;
  message: string;
  category:
    StudentNotificationCategory;
  severity:
    StudentNotificationSeverity;
  status:
    | "Active"
    | "Resolved";
  isRead: boolean;
  readAt: string | null;
  requiresAction: boolean;
  isAutomated: boolean;
  actionLabel: string | null;
  actionUrl: string | null;
  sourceType: string | null;
  sourceDocumentId: string | null;
  occurredAt: string | null;
  expiresAt: string | null;
  metadata:
    Record<string, unknown>;
}

export interface StudentNotificationSummary {
  active: number;
  unread: number;
  attention: number;
  critical: number;
  announcements: number;
}

export interface StudentNotificationFilters {
  view:
    | "active"
    | "unread"
    | "read"
    | "all";
  search: string;
  category:
    | StudentNotificationCategory
    | "all";
  severity:
    | StudentNotificationSeverity
    | "all";
  page: number;
  pageSize: number;
}

const emptySummary =
  (): StudentNotificationSummary => ({
    active: 0,
    unread: 0,
    attention: 0,
    critical: 0,
    announcements: 0,
  });

let pollingTimer:
  ReturnType<typeof setInterval> |
  null = null;

let visibilityHandler:
  (() => void) |
  null = null;

function statusCode(
  error: unknown,
) {
  const response =
    error as any;

  return (
    response?.response?.status ??
    response?.statusCode ??
    response?.status
  );
}

export function useStudentNotifications() {
  const auth =
    useAuth();
  const session =
    useStudentSession();
  const route =
    useRoute();

  const notifications =
    useState<StudentNotification[]>(
      "student-notifications",
      () => [],
    );

  const summary =
    useState<StudentNotificationSummary>(
      "student-notification-summary",
      emptySummary,
    );

  const pagination =
    useState(
      "student-notification-pagination",
      () => ({
        page: 1,
        pageSize: 10,
        pageCount: 1,
        total: 0,
      }),
    );

  const loading =
    useState(
      "student-notification-loading",
      () => false,
    );

  const error =
    useState(
      "student-notification-error",
      () => "",
    );

  // The global chip shows unread notifications only.
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

  const headers = () =>
    session.sessionKey.value
      ? {
          "X-Student-Session":
            session.sessionKey.value,
        }
      : undefined;

  async function handleUnauthorized(
    caught: unknown,
  ) {
    if (
      statusCode(caught) !==
      401
    ) {
      return false;
    }

    auth.clearSession();

    await navigateTo({
      path: "/",
      query: {
        redirect:
          route.fullPath,
      },
    });

    return true;
  }

  async function load(
    filters:
      StudentNotificationFilters,
  ) {
    loading.value = true;
    error.value = "";

    try {
      const response =
        await auth.authFetch<any>(
          "/api/student-portal/notifications",
          {
            method: "GET",
            cache: "no-store",
            headers:
              headers(),
            query: {
              ...filters,
              timestamp:
                Date.now(),
            },
          },
        );

      notifications.value =
        response.data ?? [];
      pagination.value =
        response.meta?.pagination ??
        pagination.value;

      return response;
    } catch (caught) {
      if (
        await handleUnauthorized(
          caught,
        )
      ) {
        return null;
      }

      error.value =
        auth.getErrorMessage(
          caught,
        );

      throw caught;
    } finally {
      loading.value =
        false;
    }
  }

  async function loadSummary() {
    try {
      const response =
        await auth.authFetch<{
          data:
            StudentNotificationSummary;
        }>(
          "/api/student-portal/notifications/summary",
          {
            method: "GET",
            cache: "no-store",
            headers:
              headers(),
            query: {
              timestamp:
                Date.now(),
            },
          },
        );

      summary.value =
        response.data;

      return response.data;
    } catch (caught) {
      if (
        await handleUnauthorized(
          caught,
        )
      ) {
        return null;
      }

      throw caught;
    }
  }

  async function sync() {
    const response =
      await auth.authFetch<any>(
        "/api/student-portal/notifications/sync",
        {
          method: "POST",
          headers:
            headers(),
        },
      );

    summary.value =
      response.data.summary;

    return response.data;
  }

  async function setRead(
    documentId: string,
    isRead: boolean,
  ) {
    const index =
      notifications.value.findIndex(
        (notification) =>
          notification.documentId ===
          documentId,
      );

    const previousNotification =
      index >= 0
        ? notifications.value[index]
        : undefined;
    const previousSummary = {
      ...summary.value,
    };

    if (
      previousNotification &&
      previousNotification.isRead !== isRead
    ) {
      notifications.value[index] = {
        ...previousNotification,
        isRead,
        readAt: isRead
          ? new Date().toISOString()
          : null,
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
        await auth.authFetch<{
          data:
            StudentNotification;
        }>(
          `/api/student-portal/notifications/${encodeURIComponent(
            documentId,
          )}/${isRead ? "read" : "unread"}`,
          {
            method: "PATCH",
            headers:
              headers(),
          },
        );

      if (index >= 0) {
        notifications.value[index] =
          response.data;
      }

      await loadSummary();

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
      await auth.authFetch<any>(
        "/api/student-portal/notifications/read-all",
        {
          method: "PATCH",
          headers:
            headers(),
        },
      );

    summary.value =
      response.data.summary;

    notifications.value =
      notifications.value.map(
        (notification) => ({
          ...notification,
          isRead: true,
          readAt:
            new Date()
              .toISOString(),
        }),
      );

    return response.data;
  }

  function startPolling(
    intervalMilliseconds =
      120_000,
  ) {
    if (!import.meta.client) {
      return;
    }

    void loadSummary();

    if (!pollingTimer) {
      pollingTimer =
        window.setInterval(
          () => {
            if (
              document.visibilityState ===
              "visible"
            ) {
              void loadSummary();
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
          void loadSummary();
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
    notifications,
    summary,
    pagination,
    loading,
    error,
    badgeCount,
    chipText,
    chipColor,
    load,
    loadSummary,
    sync,
    setRead,
    markAllRead,
    startPolling,
    stopPolling,
  };
}
