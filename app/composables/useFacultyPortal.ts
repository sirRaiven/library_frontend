export type FacultyUsageStatus =
  | "In Use - Good"
  | "In Use - Needs Attention"
  | "Lost - Will Replace"
  | "Replacement Submitted"
  | "Ready for Library Return";

export type FacultyReportStatus =
  | "Submitted"
  | "Acknowledged"
  | "Replacement Verified"
  | "Resolved"
  | "Cancelled";

export interface FacultyProfile {
  documentId: string;
  employeeNo: string;
  barcode: string;
  firstName: string;
  fullName: string;
  department: string;
  designation: string | null;
  email: string | null;
  contactNo: string | null;
  address: string | null;
  employmentType: string | null;
  status: string;
  photoUrl: string | null;
}

export interface FacultyBookCategoryOption {
  code: string;
  name: string;
}

export interface FacultyBook {
  documentId: string;
  title: string;
  author: string;
  isbn?: string | null;
  category?: string | null;
  callNumber?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyrightYear?: number | null;
  cover?: {
    url: string;
    alternativeText?: string | null;
  } | null;
  availability: {
    status: string;
    totalCopies: number;
    availableCopies: number;
    borrowedCopies: number;
    reservedCopies: number;
    unavailableCopies: number;
    shelfLocations: string[];
  };
}

export interface FacultyBookReport {
  documentId: string;
  reportNo: string | null;
  usageStatus: FacultyUsageStatus;
  reportStatus: FacultyReportStatus;
  facultyNotes: string | null;
  librarianNotes: string | null;
  reportedAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  processedBy: string | null;
  faculty: {
    documentId: string | null;
    employeeNo: string | null;
    fullName: string;
    department: string | null;
    designation: string | null;
  } | null;
  borrowing: {
    documentId: string | null;
    borrowNo: string | null;
    borrowDate: string | null;
    dueDate: string | null;
    status: string | null;
    remarks: string | null;
  } | null;
  copy: {
    documentId: string | null;
    controlNumber: string | null;
    accessionNumber: string | null;
    shelfLocation: string | null;
    status: string | null;
    condition: string | null;
  } | null;
  book: {
    documentId: string | null;
    title: string;
    author: string;
    isbn: string | null;
    callNumber: string | null;
    cover: { url: string; alternativeText?: string | null } | null;
  } | null;
}

export interface FacultyBorrowing {
  documentId: string;
  borrowNo: string | null;
  checkoutReference: string | null;
  borrowDate: string | null;
  dueDate: string | null;
  status: string;
  remarks: string | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  book: {
    documentId: string | null;
    title: string;
    author: string;
    isbn: string | null;
    category: string | null;
    callNumber: string | null;
    publisher: string | null;
    edition: string | null;
    cover: { url: string; alternativeText?: string | null } | null;
  };
  copy: {
    documentId: string | null;
    controlNumber: string | null;
    accessionNumber: string | null;
    shelfLocation: string | null;
    status: string | null;
    condition: string | null;
  };
  return: {
    documentId: string | null;
    returnNo: string | null;
    returnDate: string | null;
    condition: string | null;
    remarks: string | null;
  } | null;
  latestReport: FacultyBookReport | null;
}

export interface FacultyDashboardData {
  generatedAt: string;
  faculty: FacultyProfile | null;
  policy: {
    finePolicy: string;
    replacementPolicy: string;
    loanDays: number;
    maxRenewals: number;
    loanPeriod: string;
  };
  metrics: {
    currentLoans: number;
    reviewDueSoon: number;
    lostForReplacement: number;
    openReports: number;
  };
  currentLoans: FacultyBorrowing[];
  recentReports: FacultyBookReport[];
  notices: Array<{
    code: string;
    title: string;
    message: string;
    severity: "Info" | "Success" | "Warning" | "Critical";
    actionUrl?: string;
  }>;
}

function emptyDashboard(): FacultyDashboardData {
  return {
    generatedAt: "",
    faculty: null,
    policy: {
      finePolicy: "Faculty loans do not receive monetary fines.",
      replacementPolicy:
        "Lost books must be replaced with a new acceptable copy.",
      loanDays: 365,
      maxRenewals: 2,
      loanPeriod:
        "Faculty checkout defaults to 365 days unless the Library sets an earlier review or audit date.",
    },
    metrics: {
      currentLoans: 0,
      reviewDueSoon: 0,
      lostForReplacement: 0,
      openReports: 0,
    },
    currentLoans: [],
    recentReports: [],
    notices: [],
  };
}

export function useFacultyPortal() {
  const auth = useAuth();
  const config = useRuntimeConfig();
  const route = useRoute();

  const dashboard = useState<FacultyDashboardData>(
    "faculty-dashboard-data",
    emptyDashboard,
  );
  const books = useState<FacultyBook[]>("faculty-books", () => []);
  const selectedBook = useState<FacultyBook | null>(
    "faculty-selected-book",
    () => null,
  );
  const borrowings = useState<FacultyBorrowing[]>(
    "faculty-borrowings",
    () => [],
  );
  const reports = useState<FacultyBookReport[]>("faculty-reports", () => []);
  const categories = useState<string[]>("faculty-book-categories", () => []);
  const categoryOptions = useState<FacultyBookCategoryOption[]>("faculty-book-category-options", () => []);
  const loading = useState<boolean>("faculty-portal-loading", () => false);
  const detailLoading = useState<boolean>(
    "faculty-book-detail-loading",
    () => false,
  );
  const error = useState<string>("faculty-portal-error", () => "");
  const pagination = useState("faculty-portal-pagination", () => ({
    page: 1,
    pageSize: 10,
    pageCount: 1,
    total: 0,
  }));
  const summary = useState("faculty-borrowing-summary", () => ({
    currentCount: 0,
    reviewDueSoon: 0,
    lostCount: 0,
    completedCount: 0,
  }));

  function absoluteUrl(value?: string | null): string | null {
    if (!value) return null;
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    const base = String(config.public.strapiUrl).replace(/\/$/, "");
    return `${base}${value.startsWith("/") ? value : `/${value}`}`;
  }

  function normalizeBook(record: FacultyBook): FacultyBook {
    return {
      ...record,
      cover: record.cover
        ? {
            ...record.cover,
            url: absoluteUrl(record.cover.url) ?? record.cover.url,
          }
        : null,
    };
  }

  function normalizeReport(record: FacultyBookReport): FacultyBookReport {
    return {
      ...record,
      book: record.book
        ? {
            ...record.book,
            cover: record.book.cover
              ? {
                  ...record.book.cover,
                  url:
                    absoluteUrl(record.book.cover.url) ??
                    record.book.cover.url,
                }
              : null,
          }
        : null,
    };
  }

  function normalizeBorrowing(record: FacultyBorrowing): FacultyBorrowing {
    return {
      ...record,
      book: {
        ...record.book,
        cover: record.book.cover
          ? {
              ...record.book.cover,
              url:
                absoluteUrl(record.book.cover.url) ?? record.book.cover.url,
            }
          : null,
      },
      latestReport: record.latestReport
        ? normalizeReport(record.latestReport)
        : null,
    };
  }

  async function handleUnauthorized(caught: unknown): Promise<boolean> {
    const value = caught as {
      status?: number;
      statusCode?: number;
      response?: { status?: number };
    };
    const status = value.response?.status ?? value.statusCode ?? value.status;
    if (status !== 401) return false;
    auth.clearSession();
    await navigateTo({ path: "/", query: { redirect: route.fullPath } });
    return true;
  }

  async function loadDashboard({ background = false } = {}) {
    if (!background) {
      loading.value = true;
      error.value = "";
    }
    try {
      const response = await auth.authFetch<{ data: FacultyDashboardData }>(
        "/api/faculty-portal/dashboard",
      );
      dashboard.value = {
        ...response.data,
        faculty: response.data.faculty
          ? {
              ...response.data.faculty,
              photoUrl: absoluteUrl(response.data.faculty.photoUrl),
            }
          : null,
        currentLoans: response.data.currentLoans.map(normalizeBorrowing),
        recentReports: response.data.recentReports.map(normalizeReport),
      };
      return dashboard.value;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return null;
      if (!background) error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      if (!background) loading.value = false;
    }
  }

  async function loadBooks(input: {
    search?: string;
    category?: string;
    availability?: "all" | "available";
    sort?: "title-asc" | "author-asc" | "newest";
    page?: number;
    pageSize?: number;
  } = {}) {
    loading.value = true;
    error.value = "";
    try {
      const response = await auth.authFetch<{
        data: FacultyBook[];
        meta: {
          pagination: typeof pagination.value;
          categories: string[];
          categoryOptions: FacultyBookCategoryOption[];
        };
      }>("/api/faculty-portal/books", {
        query: {
          search: input.search?.trim() || undefined,
          category: input.category || undefined,
          availability: input.availability ?? "all",
          sort: input.sort ?? "title-asc",
          page: input.page ?? 1,
          pageSize: input.pageSize ?? 12,
        },
      });
      books.value = response.data.map(normalizeBook);
      categories.value = response.meta.categories ?? [];
      categoryOptions.value = response.meta.categoryOptions ?? [];
      pagination.value = response.meta.pagination;
      return books.value;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return [];
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function loadBook(documentId: string) {
    detailLoading.value = true;
    error.value = "";
    try {
      const response = await auth.authFetch<{ data: FacultyBook }>(
        `/api/faculty-portal/books/${encodeURIComponent(documentId)}`,
      );
      selectedBook.value = normalizeBook(response.data);
      return selectedBook.value;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return null;
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      detailLoading.value = false;
    }
  }

  async function loadBorrowings(input: {
    view?: "current" | "history" | "all";
    attention?: "all" | "due-soon" | "lost" | "overdue";
    search?: string;
    sort?: string;
    page?: number;
  } = {}) {
    loading.value = true;
    error.value = "";
    try {
      const response = await auth.authFetch<{
        data: FacultyBorrowing[];
        meta: {
          pagination: typeof pagination.value;
          summary: typeof summary.value;
        };
      }>("/api/faculty-portal/borrowings", {
        query: {
          view: input.view ?? "current",
          attention: input.attention && input.attention !== "all" ? input.attention : undefined,
          search: input.search?.trim() || undefined,
          sort: input.sort ?? "newest",
          page: input.page ?? 1,
          pageSize: pagination.value.pageSize,
        },
      });
      borrowings.value = response.data.map(normalizeBorrowing);
      pagination.value = response.meta.pagination;
      summary.value = response.meta.summary;
      return response;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return null;
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function loadReports(input: {
    status?: string;
    usageStatus?: string;
    search?: string;
    sort?: "newest" | "oldest";
    page?: number;
  } = {}) {
    loading.value = true;
    error.value = "";
    try {
      const response = await auth.authFetch<{
        data: FacultyBookReport[];
        meta: { pagination: typeof pagination.value };
      }>("/api/faculty-portal/reports", {
        query: {
          status: input.status && input.status !== "All" ? input.status : undefined,
          usageStatus:
            input.usageStatus && input.usageStatus !== "All"
              ? input.usageStatus
              : undefined,
          search: input.search?.trim() || undefined,
          sort: input.sort ?? "newest",
          page: input.page ?? 1,
          pageSize: pagination.value.pageSize,
        },
      });
      reports.value = response.data.map(normalizeReport);
      pagination.value = response.meta.pagination;
      return response;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return null;
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function submitBookStatus(
    borrowDocumentId: string,
    input: { usageStatus: FacultyUsageStatus; notes?: string },
  ) {
    const response = await auth.authFetch<{ data: FacultyBookReport }>(
      `/api/faculty-portal/borrowings/${encodeURIComponent(
        borrowDocumentId,
      )}/status`,
      {
        method: "POST",
        body: input,
      },
    );
    return normalizeReport(response.data);
  }

  async function updateProfile(input: {
    email?: string;
    contactNo?: string;
    address?: string;
  }) {
    const response = await auth.authFetch<{ data: FacultyProfile }>(
      "/api/faculty-portal/profile",
      { method: "PATCH", body: input },
    );
    dashboard.value.faculty = {
      ...response.data,
      photoUrl: absoluteUrl(response.data.photoUrl),
    };
    return dashboard.value.faculty;
  }

  return {
    dashboard,
    books,
    selectedBook,
    borrowings,
    reports,
    categories,
    categoryOptions,
    loading,
    detailLoading,
    error,
    pagination,
    summary,
    loadDashboard,
    loadBooks,
    loadBook,
    loadBorrowings,
    loadReports,
    submitBookStatus,
    updateProfile,
  };
}
