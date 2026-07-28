import type { StudentBookRecord } from "~/composables/useStudentBooks";

export type StudentReservationStatus =
  | "Pending"
  | "Approved"
  | "Ready for Pickup"
  | "Completed"
  | "Cancelled"
  | "Expired";

export interface StudentReservationPolicy {
  canCreate: boolean;
  blockingReasons: string[];
  activeCount: number;
  maximumActiveReservations: number;
  remainingSlots: number;
  expirationDays: number;
  pickupDays: number;
  allowReserveAvailableBooks: boolean;
  defaultExpirationDate: string;
  membership: {
    status: string;
    isActive: boolean;
    enrollmentVerified: boolean;
    expiryDate?: string | null;
  };
}

export interface StudentReservationRecord {
  documentId: string;
  reservationNo?: string | null;
  reservationDate?: string | null;
  expirationDate?: string | null;
  status: StudentReservationStatus;
  remarks?: string | null;
  daysRemaining?: number | null;
  isExpiringSoon: boolean;
  canCancel: boolean;
  book: StudentBookRecord;
}

export interface ReservableStudentBook extends StudentBookRecord {
  canSelect: boolean;
  selectionReason?: string | null;
}

interface ReservationListResponse {
  data: StudentReservationRecord[];
  meta: {
    view: "active" | "history" | "all";
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    summary: {
      activeCount: number;
      readyCount: number;
      historyCount: number;
    };
    policy: StudentReservationPolicy;
  };
}

interface ReservationBookSearchResponse {
  data: ReservableStudentBook[];
  policy: StudentReservationPolicy;
}

interface CreateReservationsResponse {
  data: {
    created: Array<{
      documentId: string;
      reservationNo: string;
      status: StudentReservationStatus;
      expirationDate: string;
      book: {
        documentId: string;
        title: string;
        author: string;
        category?: string | null;
      };
    }>;
    failed: Array<{
      bookDocumentId: string;
      message: string;
    }>;
    policy: StudentReservationPolicy;
  };
}

function httpStatus(error: unknown): number | undefined {
  const value = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };

  return value.response?.status ?? value.statusCode ?? value.status;
}

export function useStudentReservations() {
  const auth = useAuth();
  const session = useStudentSession();
  const route = useRoute();

  const records = useState<StudentReservationRecord[]>(
    "student-reservations",
    () => [],
  );
  const policy = useState<StudentReservationPolicy | null>(
    "student-reservation-policy",
    () => null,
  );
  const summary = useState(
    "student-reservation-summary",
    () => ({ activeCount: 0, readyCount: 0, historyCount: 0 }),
  );
  const pagination = useState(
    "student-reservation-pagination",
    () => ({ page: 1, pageSize: 10, pageCount: 1, total: 0 }),
  );
  const searchResults = useState<ReservableStudentBook[]>(
    "student-reservation-book-results",
    () => [],
  );
  const loading = useState("student-reservation-loading", () => false);
  const searching = useState("student-reservation-searching", () => false);
  const creating = useState("student-reservation-creating", () => false);
  const cancellingId = useState<string | null>(
    "student-reservation-cancelling-id",
    () => null,
  );
  const error = useState("student-reservation-error", () => "");

  function headers(): HeadersInit | undefined {
    return session.sessionKey.value
      ? { "x-student-session": session.sessionKey.value }
      : undefined;
  }

  async function unauthorized(caught: unknown) {
    if (httpStatus(caught) !== 401) return false;
    auth.clearSession();
    await navigateTo({ path: "/", query: { redirect: route.fullPath } });
    return true;
  }

  async function load(
    view: "active" | "history" | "all" = "active",
    page = 1,
  ) {
    loading.value = true;
    error.value = "";

    try {
      const response = await auth.authFetch<ReservationListResponse>(
        "/api/student-portal/reservations",
        {
          method: "GET",
          headers: headers(),
          query: { view, page, pageSize: pagination.value.pageSize },
        },
      );

      records.value = response.data;
      policy.value = response.meta.policy;
      summary.value = response.meta.summary;
      pagination.value = response.meta.pagination;
      return response;
    } catch (caught) {
      if (await unauthorized(caught)) return null;
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function searchBooks(search: string) {
    const normalized = search.trim();
    if (normalized.length < 2) {
      searchResults.value = [];
      return [];
    }

    searching.value = true;
    try {
      const response = await auth.authFetch<ReservationBookSearchResponse>(
        "/api/student-portal/reservation-books",
        {
          method: "GET",
          headers: headers(),
          query: { search: normalized },
        },
      );
      searchResults.value = response.data;
      policy.value = response.policy;
      return response.data;
    } finally {
      searching.value = false;
    }
  }

  async function create(bookDocumentIds: string[], remarks = "") {
    creating.value = true;
    try {
      const response = await auth.authFetch<CreateReservationsResponse>(
        "/api/student-portal/reservations",
        {
          method: "POST",
          headers: headers(),
          body: {
            data: {
              bookDocumentIds,
              remarks: remarks.trim() || undefined,
            },
          },
        },
      );
      policy.value = response.data.policy;
      return response.data;
    } finally {
      creating.value = false;
    }
  }

  async function cancel(documentId: string) {
    cancellingId.value = documentId;
    try {
      await auth.authFetch(
        `/api/student-portal/reservations/${encodeURIComponent(documentId)}/cancel`,
        {
          method: "PATCH",
          headers: headers(),
        },
      );
    } finally {
      cancellingId.value = null;
    }
  }

  function clearBookSearch() {
    searchResults.value = [];
  }

  return {
    records,
    policy,
    summary,
    pagination,
    searchResults,
    loading,
    searching,
    creating,
    cancellingId,
    error,
    load,
    searchBooks,
    create,
    cancel,
    clearBookSearch,
  };
}
