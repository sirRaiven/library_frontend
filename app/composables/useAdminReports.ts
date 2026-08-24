import type { LibraryReportDocument } from "~/types/libraryReports";

export interface AdminAuditReportFilters {
  from?: string;
  to?: string;
  category?: string;
  severity?: string;
  outcome?: string;
}

export function useAdminReports() {
  const auth = useAuth();

  async function audit(filters: AdminAuditReportFilters = {}) {
    const response = await auth.authFetch<{ data: LibraryReportDocument }>(
      "/api/admin-reports/audit",
      {
        query: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          category:
            filters.category && filters.category !== "All"
              ? filters.category
              : undefined,
          severity:
            filters.severity && filters.severity !== "All"
              ? filters.severity
              : undefined,
          outcome:
            filters.outcome && filters.outcome !== "All"
              ? filters.outcome
              : undefined,
        },
      },
    );

    return response.data;
  }

  return { audit };
}
