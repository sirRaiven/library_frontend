export type AdminDataFieldKind =
  | "text"
  | "textarea"
  | "integer"
  | "date"
  | "datetime"
  | "select"
  | "boolean"
  | "relation";

export interface AdminDataEditableField {
  key: string;
  label: string;
  kind: AdminDataFieldKind;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  help?: string;
  relationDomain?: string;
}

export interface AdminDataEditor {
  mode: "inline" | "route";
  label: string;
  routeTemplate?: string;
}

export interface AdminManagedDataDomain {
  key: string;
  label: string;
  singularLabel: string;
  group: "Catalog" | "Configuration" | "Communication" | "People" | "Operations" | "Security";
  description: string;
  icon: string;
  editor: AdminDataEditor;
  canCreate: boolean;
  createFields: AdminDataEditableField[];
  editableFields: AdminDataEditableField[];
  counts: {
    active: number;
    archived: number;
    total: number;
  };
}

export interface AdminProtectedDataDomain {
  key: string;
  label: string;
  icon: string;
  reason: string;
  href: string | null;
  count: number | null;
}

export interface AdminDataCatalog {
  managed: AdminManagedDataDomain[];
  protected: AdminProtectedDataDomain[];
  permissions: {
    canPermanentlyDelete: boolean;
    permanentDeleteRole: string;
  };
  safeguards: {
    archiveReversible: boolean;
    dependencyCheckRequired: boolean;
    permanentDeleteRequiresArchive: boolean;
    permanentDeleteRequiresReason: boolean;
    permanentDeleteRequiresTypedConfirmation: boolean;
  };
}

export interface AdminManagedRecord {
  documentId: string;
  title: string;
  subtitle: string;
  status: string;
  meta: string[];
  updatedAt: string | null;
  createdAt: string | null;
  archived: boolean;
  canEdit: boolean;
  editBlockedReason: string | null;
  canArchive: boolean;
  canRestore: boolean;
  canDeletePermanently: boolean;
  editValues: Record<string, unknown>;
  rawHints: {
    automatic?: boolean;
    current?: boolean;
    domain?: string | null;
    storedValue?: string | null;
  };
}

export interface AdminDataPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface AdminDeletionImpact {
  documentId: string;
  title: string;
  domain: string;
  domainLabel: string;
  archived: boolean;
  allowed: boolean;
  blockers: Array<{
    key: string;
    label: string;
    count: number;
    message: string;
  }>;
  dependencies?: Array<{
    key: string;
    label: string;
    count: number;
    message: string;
  }>;
  affectedRecords?: number;
  notes: string[];
  confirmationPhrase: string;
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? value as Record<string, any>
    : {};
}

function normalizedCatalog(value: unknown): AdminDataCatalog {
  const source = asObject(value);
  return {
    managed: Array.isArray(source.managed) ? source.managed : [],
    protected: Array.isArray(source.protected) ? source.protected : [],
    permissions: {
      canPermanentlyDelete: Boolean(source.permissions?.canPermanentlyDelete),
      permanentDeleteRole: String(source.permissions?.permanentDeleteRole || "Administrator or Super Administrator"),
    },
    safeguards: {
      archiveReversible: source.safeguards?.archiveReversible !== false,
      dependencyCheckRequired: source.safeguards?.dependencyCheckRequired !== false,
      permanentDeleteRequiresArchive: source.safeguards?.permanentDeleteRequiresArchive !== false,
      permanentDeleteRequiresReason: source.safeguards?.permanentDeleteRequiresReason !== false,
      permanentDeleteRequiresTypedConfirmation: source.safeguards?.permanentDeleteRequiresTypedConfirmation !== false,
    },
  };
}

export function useAdminDataManagement() {
  const auth = useAuth();

  async function catalog(): Promise<AdminDataCatalog> {
    const response = await auth.authFetch<{ data?: unknown }>(
      "/api/admin-data-management/catalog",
    );
    return normalizedCatalog(response?.data);
  }

  async function list(
    domain: string,
    input: {
      scope?: "active" | "archived";
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const response = await auth.authFetch<{
      data?: AdminManagedRecord[];
      meta?: AdminDataPagination;
    }>(`/api/admin-data-management/records/${encodeURIComponent(domain)}`, {
      query: {
        scope: input.scope ?? "active",
        search: input.search || undefined,
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 25,
      },
    });

    const data = Array.isArray(response?.data) ? response.data : [];
    const meta = response?.meta ?? {
      page: 1,
      pageSize: input.pageSize ?? 25,
      pageCount: 1,
      total: data.length,
    };

    return { data, meta };
  }

  async function lookup(domain: string, search?: string) {
    const response = await auth.authFetch<{ data?: Array<{ label: string; value: string }> }>(
      `/api/admin-data-management/lookups/${encodeURIComponent(domain)}`,
      { query: { search: search || undefined, limit: 250 } },
    );
    return Array.isArray(response?.data) ? response.data : [];
  }

  async function create(
    domain: string,
    fields: Record<string, unknown>,
    reason?: string,
  ) {
    const response = await auth.authFetch<{ data?: AdminManagedRecord }>(
      `/api/admin-data-management/records/${encodeURIComponent(domain)}`,
      {
        method: "POST",
        body: { data: { fields, reason } },
      },
    );
    return response?.data;
  }

  async function update(
    domain: string,
    documentId: string,
    fields: Record<string, unknown>,
    reason?: string,
  ) {
    const response = await auth.authFetch<{ data?: AdminManagedRecord }>(
      `/api/admin-data-management/records/${encodeURIComponent(domain)}/${encodeURIComponent(documentId)}`,
      {
        method: "PATCH",
        body: { data: { fields, reason } },
      },
    );
    return response?.data;
  }

  async function archive(
    domain: string,
    documentId: string,
    reason: string,
  ) {
    const response = await auth.authFetch<{ data?: AdminManagedRecord }>(
      `/api/admin-data-management/records/${encodeURIComponent(domain)}/${encodeURIComponent(documentId)}/archive`,
      {
        method: "POST",
        body: { data: { reason } },
      },
    );
    return response?.data;
  }

  async function restore(
    domain: string,
    documentId: string,
    reason: string,
  ) {
    const response = await auth.authFetch<{ data?: AdminManagedRecord }>(
      `/api/admin-data-management/records/${encodeURIComponent(domain)}/${encodeURIComponent(documentId)}/restore`,
      {
        method: "POST",
        body: { data: { reason } },
      },
    );
    return response?.data;
  }

  async function deletionImpact(
    domain: string,
    documentId: string,
  ): Promise<AdminDeletionImpact> {
    const response = await auth.authFetch<{ data?: AdminDeletionImpact }>(
      `/api/admin-data-management/records/${encodeURIComponent(domain)}/${encodeURIComponent(documentId)}/deletion-impact`,
    );

    if (!response?.data) {
      throw new Error("The deletion-impact check returned no data.");
    }
    return response.data;
  }

  async function deletePermanently(
    domain: string,
    documentId: string,
    input: { reason: string; confirmation: string },
  ) {
    const response = await auth.authFetch<{
      data?: {
        deleted: boolean;
        documentId: string;
        title: string;
        domain: string;
      };
    }>(
      `/api/admin-data-management/records/${encodeURIComponent(domain)}/${encodeURIComponent(documentId)}/delete-permanently`,
      {
        method: "POST",
        body: { data: input },
      },
    );
    return response?.data;
  }

  return {
    catalog,
    list,
    lookup,
    create,
    update,
    archive,
    restore,
    deletionImpact,
    deletePermanently,
  };
}
