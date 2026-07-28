export type StudentBookAvailabilityStatus =
  | "Available"
  | "Currently Unavailable"
  | "No Physical Copies";

export interface StudentBookCover {
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface StudentBookAvailability {
  status: StudentBookAvailabilityStatus;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  unavailableCopies: number;
  shelfLocations: string[];
}

export interface StudentBookRecord {
  documentId: string;
  title: string;
  author: string;
  isbn?: string | null;
  category?: string | null;
  callNumber?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyrightYear?: number | null;
  cover?: StudentBookCover | null;
  availability: StudentBookAvailability;
}

export interface StudentBookFilters {
  search: string;
  category: string;
  availability: "all" | "available";
  sort: "title-asc" | "author-asc" | "newest";
  page: number;
  pageSize: number;
}

interface StudentBookListResponse {
  data: StudentBookRecord[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    categories: string[];
    filters: {
      search: string;
      category: string | null;
      availability: "all" | "available";
      sort: "title-asc" | "author-asc" | "newest";
    };
  };
}

interface StudentBookResponse {
  data: StudentBookRecord;
}

type CollectionActivity = "view" | "search" | undefined;

function defaultFilters(): StudentBookFilters {
  return {
    search: "",
    category: "",
    availability: "all",
    sort: "title-asc",
    page: 1,
    pageSize: 12,
  };
}

function httpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };

  return (
    fetchError.response?.status ??
    fetchError.statusCode ??
    fetchError.status
  );
}

export function useStudentBooks() {
  const auth = useAuth();
  const session = useStudentSession();
  const config = useRuntimeConfig();
  const route = useRoute();

  const books = useState<StudentBookRecord[]>(
    "student-book-collection",
    () => [],
  );
  const selectedBook = useState<StudentBookRecord | null>(
    "student-selected-book",
    () => null,
  );
  const categories = useState<string[]>(
    "student-book-categories",
    () => [],
  );
  const filters = useState<StudentBookFilters>(
    "student-book-filters",
    defaultFilters,
  );
  const pagination = useState(
    "student-book-pagination",
    () => ({
      page: 1,
      pageSize: 12,
      pageCount: 1,
      total: 0,
    }),
  );
  const loading = useState<boolean>(
    "student-book-loading",
    () => false,
  );
  const detailLoading = useState<boolean>(
    "student-book-detail-loading",
    () => false,
  );
  const error = useState<string>(
    "student-book-error",
    () => "",
  );
  const detailError = useState<string>(
    "student-book-detail-error",
    () => "",
  );

  function sessionHeaders(): HeadersInit | undefined {
    return session.sessionKey.value
      ? { "x-student-session": session.sessionKey.value }
      : undefined;
  }

  function absoluteMediaUrl(url?: string | null): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;

    const base = String(config.public.strapiUrl).replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : `/${url}`}`;
  }

  function normalizeBook(record: StudentBookRecord): StudentBookRecord {
    return {
      ...record,
      cover: record.cover
        ? {
            ...record.cover,
            url: absoluteMediaUrl(record.cover.url) ?? record.cover.url,
          }
        : null,
    };
  }

  async function handleUnauthorized(errorValue: unknown): Promise<boolean> {
    if (httpStatus(errorValue) !== 401) return false;

    auth.clearSession();
    await navigateTo({
      path: "/",
      query: { redirect: route.fullPath },
    });
    return true;
  }

  async function loadBooks(
    nextFilters: Partial<StudentBookFilters> = {},
    activity?: CollectionActivity,
  ): Promise<StudentBookRecord[]> {
    filters.value = {
      ...filters.value,
      ...nextFilters,
      search: String(nextFilters.search ?? filters.value.search).trim(),
    };

    loading.value = true;
    error.value = "";

    try {
      const response = await auth.authFetch<StudentBookListResponse>(
        "/api/student-portal/books",
        {
          method: "GET",
          headers: sessionHeaders(),
          query: {
            search: filters.value.search || undefined,
            category: filters.value.category || undefined,
            availability: filters.value.availability,
            sort: filters.value.sort,
            page: filters.value.page,
            pageSize: filters.value.pageSize,
            activity,
          },
        },
      );

      books.value = response.data.map(normalizeBook);
      categories.value = response.meta.categories;
      pagination.value = response.meta.pagination;
      filters.value = {
        ...filters.value,
        page: response.meta.pagination.page,
        pageSize: response.meta.pagination.pageSize,
        search: response.meta.filters.search,
        category: response.meta.filters.category ?? "",
        availability: response.meta.filters.availability,
        sort: response.meta.filters.sort,
      };

      return books.value;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return [];
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function loadBook(documentId: string): Promise<StudentBookRecord | null> {
    const identifier = documentId.trim();

    if (!identifier) {
      detailError.value = "The book identifier is missing.";
      selectedBook.value = null;
      return null;
    }

    detailLoading.value = true;
    detailError.value = "";

    try {
      const response = await auth.authFetch<StudentBookResponse>(
        `/api/student-portal/books/${encodeURIComponent(identifier)}`,
        {
          method: "GET",
          headers: sessionHeaders(),
        },
      );

      selectedBook.value = normalizeBook(response.data);
      return selectedBook.value;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return null;
      detailError.value = auth.getErrorMessage(caught);
      selectedBook.value = null;
      throw caught;
    } finally {
      detailLoading.value = false;
    }
  }

  function resetFilters() {
    filters.value = defaultFilters();
  }

  return {
    books,
    selectedBook,
    categories,
    filters,
    pagination,
    loading,
    detailLoading,
    error,
    detailError,
    loadBooks,
    loadBook,
    resetFilters,
  };
}
