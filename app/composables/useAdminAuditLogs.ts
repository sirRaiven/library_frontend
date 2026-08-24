import type { AdminPaginationMeta } from "~/composables/useAdminUsers";

export type AdminAuditCategory =
  | "Administrative"
  | "Security"
  | "Configuration"
  | "Transaction"
  | "Privacy"
  | "System";

export type AdminAuditSeverity = "Info" | "Notice" | "Warning" | "Critical";
export type AdminAuditOutcome = "Success" | "Failure" | "Denied";

export interface AdminAuditLogRecord {
  id: number;
  documentId?: string;
  eventId?: string | null;
  category: AdminAuditCategory;
  severity: AdminAuditSeverity;
  module: string;
  action: string;
  description: string;
  reason?: string | null;
  actor: string;
  actorUsername?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  outcome: AdminAuditOutcome;
  requestId?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
  ipAddress?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  integrityVersion?: number | null;
  previousHash?: string | null;
  recordHash?: string | null;
  sealed: boolean;
  createdAt: string;
}

export interface AdminAuditSummary {
  total: number;
  outcomes: {
    success: number;
    failure: number;
    denied: number;
  };
  severities: {
    warning: number;
    critical: number;
  };
  integrity: {
    sealed: number;
    legacyUnsealed: number;
  };
  categories: Record<AdminAuditCategory, number>;
}

export interface AdminAuditIntegrity {
  status: "Valid" | "Attention Required";
  checkedAt: string;
  sealedCount: number;
  legacyUnsealedCount: number;
  checkedCount: number;
  truncated: boolean;
  headHash?: string | null;
  issues: Array<{
    id: number;
    eventId?: string | null;
    type: "CHAIN_BREAK" | "HASH_MISMATCH";
  }>;
}

export interface AdminAuditFilters {
  search?: string;
  outcome?: string;
  category?: string;
  severity?: string;
  module?: string;
  actorRole?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

function queryFrom(filters: AdminAuditFilters) {
  return {
    search: filters.search || undefined,
    outcome:
      filters.outcome && filters.outcome !== "All"
        ? filters.outcome
        : undefined,
    category:
      filters.category && filters.category !== "All"
        ? filters.category
        : undefined,
    severity:
      filters.severity && filters.severity !== "All"
        ? filters.severity
        : undefined,
    module:
      filters.module && filters.module !== "All"
        ? filters.module
        : undefined,
    actorRole:
      filters.actorRole && filters.actorRole !== "All"
        ? filters.actorRole
        : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };
}

export function useAdminAuditLogs() {
  const auth = useAuth();

  async function list(filters: AdminAuditFilters = {}) {
    return await auth.authFetch<{
      data: AdminAuditLogRecord[];
      meta: AdminPaginationMeta;
    }>("/api/admin-management/audit-logs", {
      query: {
        ...queryFrom(filters),
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
      },
    });
  }

  async function summary(filters: AdminAuditFilters = {}) {
    const response = await auth.authFetch<{ data: AdminAuditSummary }>(
      "/api/admin-management/audit-summary",
      { query: queryFrom(filters) },
    );
    return response.data;
  }

  async function integrity(limit = 10_000) {
    const response = await auth.authFetch<{ data: AdminAuditIntegrity }>(
      "/api/admin-management/audit-integrity",
      { query: { limit } },
    );
    return response.data;
  }

  return { list, summary, integrity };
}
