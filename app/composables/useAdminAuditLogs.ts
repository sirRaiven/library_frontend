import type { AdminPaginationMeta } from "~/composables/useAdminUsers";

export interface AdminAuditLogRecord {
  id: number;
  documentId?: string;
  module: string;
  action: string;
  description: string;
  actor: string;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  outcome: "Success" | "Failure";
  requestMethod?: string | null;
  requestPath?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export function useAdminAuditLogs() {
  const auth = useAuth();

  async function list(filters: {
    search?: string;
    outcome?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    return await auth.authFetch<{
      data: AdminAuditLogRecord[];
      meta: AdminPaginationMeta;
    }>("/api/admin-management/audit-logs", {
      query: {
        search: filters.search || undefined,
        outcome:
          filters.outcome && filters.outcome !== "All"
            ? filters.outcome
            : undefined,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
      },
    });
  }

  return { list };
}
