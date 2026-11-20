export type PortalHistoryAudience = "librarian" | "student";

export type PortalHistoryCategory =
  | "all"
  | "borrowing"
  | "return"
  | "reservation"
  | "fine"
  | "visit"
  | "account";

export type PortalHistorySort = "newest" | "oldest";
export type PortalHistoryScope = "all" | "mine";

export interface PortalHistoryFilters {
  search?: string;
  category?: PortalHistoryCategory;
  dateFrom?: string;
  dateTo?: string;
  sort?: PortalHistorySort;
  scope?: PortalHistoryScope;
  page?: number;
  pageSize?: number;
}

export interface PortalHistoryEntry {
  id: string;
  category: Exclude<PortalHistoryCategory, "all">;
  occurredAt: string;
  dueDate?: string | null;
  borrowingReference?: string | null;
  title: string;
  description: string;
  reference: string | null;
  status: string;
  actor: string | null;
  member: {
    type: "Student" | "Faculty";
    documentId: string | null;
    identifier: string | null;
    name: string;
  } | null;
  book: {
    documentId: string | null;
    title: string;
    controlNumber: string | null;
  } | null;
  amount: number | null;
}

interface PortalHistorySummary {
  total: number;
  borrowing: number;
  return: number;
  reservation: number;
  fine: number;
  visit: number;
  account: number;
}

interface PortalHistoryResponse {
  data: PortalHistoryEntry[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    summary: PortalHistorySummary;
    filters: {
      search: string | null;
      category: PortalHistoryCategory;
      dateFrom: string | null;
      dateTo: string | null;
      sort: PortalHistorySort;
      scope: PortalHistoryScope;
    };
  };
}

const emptySummary = (): PortalHistorySummary => ({
  total: 0,
  borrowing: 0,
  return: 0,
  reservation: 0,
  fine: 0,
  visit: 0,
  account: 0,
});

export function usePortalHistory(audience: PortalHistoryAudience) {
  const auth = useAuth();
  const records = ref<PortalHistoryEntry[]>([]);
  const summary = ref<PortalHistorySummary>(emptySummary());
  const pagination = ref({
    page: 1,
    pageSize: 15,
    pageCount: 1,
    total: 0,
  });
  const loading = ref(false);
  const error = ref("");

  async function load(filters: PortalHistoryFilters = {}) {
    loading.value = true;
    error.value = "";

    try {
      const query = new URLSearchParams();

      if (filters.search?.trim()) query.set("search", filters.search.trim());
      if (filters.category) query.set("category", filters.category);
      if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) query.set("dateTo", filters.dateTo);
      if (filters.sort) query.set("sort", filters.sort);
      if (filters.scope && audience === "librarian") {
        query.set("scope", filters.scope);
      }
      query.set("page", String(filters.page ?? 1));
      query.set("pageSize", String(filters.pageSize ?? 15));

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await auth.authFetch<PortalHistoryResponse>(
        `/api/portal-history/${audience}${suffix}`,
      );

      records.value = Array.isArray(response.data) ? response.data : [];
      summary.value = response.meta?.summary ?? emptySummary();
      pagination.value = response.meta?.pagination ?? {
        page: 1,
        pageSize: filters.pageSize ?? 15,
        pageCount: 1,
        total: 0,
      };

      return response;
    } catch (caught) {
      records.value = [];
      summary.value = emptySummary();
      pagination.value = {
        page: 1,
        pageSize: filters.pageSize ?? 15,
        pageCount: 1,
        total: 0,
      };
      const status = Number(
        (caught as any)?.response?.status ??
          (caught as any)?.statusCode ??
          (caught as any)?.status ??
          0,
      );

      error.value =
        status === 404
          ? "The History Logs service is not available yet. Restart the Library backend after installing the History Logs backend files."
          : auth.getErrorMessage(caught);

      throw caught;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    records.value = [];
    summary.value = emptySummary();
    pagination.value = {
      page: 1,
      pageSize: 15,
      pageCount: 1,
      total: 0,
    };
    error.value = "";
  }

  return {
    records,
    summary,
    pagination,
    loading,
    error,
    load,
    reset,
  };
}
