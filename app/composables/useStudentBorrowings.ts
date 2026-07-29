export type StudentBorrowingView = "current" | "history" | "all";

export interface StudentBorrowingRecord {
  documentId: string;
  borrowNo: string | null;
  checkoutReference: string | null;
  borrowDate: string | null;
  dueDate: string | null;
  status: string;
  remarks: string | null;
  daysRemaining: number | null;
  overdueDays: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  book: {
    documentId: string | null;
    title: string;
    author: string;
    isbn: string | null;
    cover: {
      url: string;
      alternativeText?: string | null;
      width?: number | null;
      height?: number | null;
    } | null;
  };
  copy: {
    documentId: string | null;
    controlNumber: string | null;
    accessionNumber: string | null;
    shelfLocation: string | null;
    status: string | null;
  };
  return: {
    documentId: string | null;
    returnNo: string | null;
    returnDate: string | null;
    condition: string | null;
    fineAmount: number;
    remarks: string | null;
  } | null;
}

export interface StudentBorrowingSummary {
  currentCount: number;
  overdueCount: number;
  dueSoonCount: number;
  historyCount: number;
  returnedCount: number;
  totalFineAssessed: number;
}

interface StudentBorrowingResponse {
  data: StudentBorrowingRecord[];
  meta: {
    view: StudentBorrowingView;
    filters: {
      search: string;
      sort: string;
    };
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    summary: StudentBorrowingSummary;
    notes: {
      fineAmount: string;
      renewal: string;
    };
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

export function useStudentBorrowings() {
  const auth = useAuth();
  const session = useStudentSession();
  const route = useRoute();

  const records = useState<StudentBorrowingRecord[]>(
    "student-borrowing-records",
    () => [],
  );
  const summary = useState<StudentBorrowingSummary>(
    "student-borrowing-summary",
    () => ({
      currentCount: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      historyCount: 0,
      returnedCount: 0,
      totalFineAssessed: 0,
    }),
  );
  const pagination = useState(
    "student-borrowing-pagination",
    () => ({ page: 1, pageSize: 10, pageCount: 1, total: 0 }),
  );
  const notes = useState(
    "student-borrowing-notes",
    () => ({
      fineAmount:
        "Fine amounts shown are recorded assessments, not a verified unpaid balance.",
      renewal:
        "Online renewal is not enabled. Contact the Library for renewal assistance.",
    }),
  );
  const loading = useState("student-borrowing-loading", () => false);
  const error = useState("student-borrowing-error", () => "");

  function headers(): HeadersInit | undefined {
    return session.sessionKey.value
      ? { "X-Student-Session": session.sessionKey.value }
      : undefined;
  }

  async function unauthorized(caught: unknown) {
    if (httpStatus(caught) !== 401) return false;

    auth.clearSession();
    await navigateTo({
      path: "/",
      query: { redirect: route.fullPath },
    });
    return true;
  }

  async function load(input: {
    view?: StudentBorrowingView;
    search?: string;
    sort?: string;
    page?: number;
  } = {}) {
    if (loading.value) return null;

    loading.value = true;
    error.value = "";

    try {
      const response = await auth.authFetch<StudentBorrowingResponse>(
        "/api/student-portal/borrowings",
        {
          method: "GET",
          headers: headers(),
          query: {
            view: input.view ?? "current",
            search: input.search?.trim() || undefined,
            sort: input.sort || undefined,
            page: input.page ?? 1,
            pageSize: pagination.value.pageSize,
          },
        },
      );

      records.value = response.data;
      summary.value = response.meta.summary;
      pagination.value = response.meta.pagination;
      notes.value = response.meta.notes;
      return response;
    } catch (caught) {
      if (await unauthorized(caught)) return null;

      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    records.value = [];
    error.value = "";
    pagination.value = {
      ...pagination.value,
      page: 1,
      pageCount: 1,
      total: 0,
    };
  }

  return {
    records,
    summary,
    pagination,
    notes,
    loading,
    error,
    load,
    reset,
  };
}
