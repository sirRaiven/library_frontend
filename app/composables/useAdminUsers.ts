export interface AdminRoleSummary {
  id: number;
  documentId?: string;
  name: string;
  type: string;
  description?: string;
  userCount?: number;
  protected?: boolean;
}

export type AdminManagedProfileType = "Student" | "Faculty" | "Librarian";
export type AdminProfileExpectation =
  | AdminManagedProfileType
  | "Administrator"
  | null;
export type AdminProfileLinkStatus =
  | "Linked"
  | "Missing"
  | "Mismatch"
  | "Not Required"
  | "Unsupported Role"
  | "Unavailable";

export interface AdminLinkedProfile {
  id: number;
  documentId: string;
  type: AdminManagedProfileType;
  code: string;
  fullName: string;
  email?: string | null;
  status?: string | null;
}

export interface AdminProfileGovernance {
  status: AdminProfileLinkStatus;
  required: boolean;
  expectedType: AdminProfileExpectation;
  profile: AdminLinkedProfile | null;
  profiles: AdminLinkedProfile[];
  issues: string[];
  canLink: boolean;
}

export interface AdminUserRecord {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  role: AdminRoleSummary | null;
  profileGovernance: AdminProfileGovernance;
}

export interface AdminPaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface AdminUserFilters {
  search?: string;
  role?: string;
  status?: "all" | "active" | "blocked" | "unconfirmed";
  profileStatus?:
    | "all"
    | "linked"
    | "missing"
    | "mismatch"
    | "not-required"
    | "unsupported-role";
  page?: number;
  pageSize?: number;
}

export interface CreateFacultyAccountDetailsInput {
  employeeNo?: string;
  barcode?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  departmentCode?: string;
  designation?: string;
  contactNo?: string;
  employmentTypeCode?: string;
}

export interface CreateAdminUserInput {
  username: string;
  email: string;
  password: string;
  roleId: number;
  confirmed?: boolean;
  facultyDetails?: CreateFacultyAccountDetailsInput;
}

const PROFILE_STATUSES = new Set<AdminProfileLinkStatus>([
  "Linked",
  "Missing",
  "Mismatch",
  "Not Required",
  "Unsupported Role",
  "Unavailable",
]);

const ADMIN_ROLE_TYPES = new Set([
  "administrator",
  "system-administrator",
  "super-administrator",
  "admin",
]);

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

function roleType(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function expectedProfile(role: AdminRoleSummary | null): AdminProfileExpectation {
  const type = roleType(role?.type || role?.name);

  if (type === "student") return "Student";
  if (type === "faculty") return "Faculty";
  if (type === "librarian") return "Librarian";
  if (ADMIN_ROLE_TYPES.has(type)) return "Administrator";
  return null;
}

function normalizeRole(value: unknown): AdminRoleSummary | null {
  const role = asRecord(value);
  if (!role.id && !role.name && !role.type) return null;

  return {
    id: Number(role.id || 0),
    documentId: role.documentId ? String(role.documentId) : undefined,
    name: String(role.name || role.type || "Unnamed role"),
    type: String(role.type || role.name || "unknown"),
    description: role.description ? String(role.description) : "",
    userCount: Number.isFinite(Number(role.userCount))
      ? Number(role.userCount)
      : undefined,
    protected:
      typeof role.protected === "boolean" ? role.protected : undefined,
  };
}

export function normalizeAdminLinkedProfile(
  value: unknown,
): AdminLinkedProfile | null {
  const profile = asRecord(value);
  const type =
    profile.type === "Student" ||
    profile.type === "Faculty" ||
    profile.type === "Librarian"
      ? profile.type
      : null;

  if (!type || (!profile.id && !profile.documentId)) return null;

  return {
    id: Number(profile.id || 0),
    documentId: String(profile.documentId || ""),
    type,
    code: String(profile.code || "Not recorded"),
    fullName: String(profile.fullName || "Unnamed profile"),
    email: profile.email ? String(profile.email) : null,
    status: profile.status ? String(profile.status) : null,
  };
}

function unavailableGovernance(
  role: AdminRoleSummary | null,
): AdminProfileGovernance {
  const expectedType = expectedProfile(role);
  const required =
    expectedType === "Student" ||
    expectedType === "Faculty" ||
    expectedType === "Librarian";

  return {
    status: "Unavailable",
    required,
    expectedType,
    profile: null,
    profiles: [],
    issues: [
      "Profile connection details are currently unavailable. Refresh after the backend service is restarted, or contact a system administrator.",
    ],
    canLink: required,
  };
}

function normalizeGovernance(
  value: unknown,
  role: AdminRoleSummary | null,
): AdminProfileGovernance {
  const governance = asRecord(value);
  if (!Object.keys(governance).length) {
    return unavailableGovernance(role);
  }

  const status = PROFILE_STATUSES.has(governance.status)
    ? (governance.status as AdminProfileLinkStatus)
    : "Unavailable";
  const expectedType =
    governance.expectedType === "Student" ||
    governance.expectedType === "Faculty" ||
    governance.expectedType === "Librarian" ||
    governance.expectedType === "Administrator"
      ? governance.expectedType
      : expectedProfile(role);
  const profiles = Array.isArray(governance.profiles)
    ? governance.profiles
        .map(normalizeAdminLinkedProfile)
        .filter((profile): profile is AdminLinkedProfile => Boolean(profile))
    : [];
  const profile = normalizeAdminLinkedProfile(governance.profile) ?? profiles[0] ?? null;
  const required = typeof governance.required === "boolean"
    ? governance.required
    : expectedType === "Student" ||
      expectedType === "Faculty" ||
      expectedType === "Librarian";
  const issues = Array.isArray(governance.issues)
    ? governance.issues.map((issue: unknown) => String(issue)).filter(Boolean)
    : [];

  if (status === "Unavailable" && !issues.length) {
    issues.push(
      "Profile connection details were incomplete in the backend response.",
    );
  }

  return {
    status,
    required,
    expectedType,
    profile,
    profiles,
    issues,
    canLink:
      typeof governance.canLink === "boolean"
        ? governance.canLink
        : required,
  };
}

export function normalizeAdminUserRecord(value: unknown): AdminUserRecord {
  const record = asRecord(value);
  const role = normalizeRole(record.role);

  return {
    id: Number(record.id || 0),
    documentId: record.documentId ? String(record.documentId) : undefined,
    username: String(record.username || "Unnamed account"),
    email: String(record.email || "No email recorded"),
    provider: String(record.provider || "local"),
    confirmed: Boolean(record.confirmed),
    blocked: Boolean(record.blocked),
    createdAt: String(record.createdAt || new Date(0).toISOString()),
    updatedAt: String(record.updatedAt || record.createdAt || new Date(0).toISOString()),
    role,
    profileGovernance: normalizeGovernance(record.profileGovernance, role),
  };
}

function normalizePaginationMeta(
  value: unknown,
  fallbackTotal = 0,
): AdminPaginationMeta {
  const meta = asRecord(value);
  const page = Math.max(1, Number(meta.page || 1));
  const pageSize = Math.max(1, Number(meta.pageSize || 25));
  const total = Math.max(0, Number(meta.total ?? fallbackTotal));

  return {
    page,
    pageSize,
    pageCount: Math.max(1, Number(meta.pageCount || Math.ceil(total / pageSize) || 1)),
    total,
  };
}

export function useAdminUsers() {
  const auth = useAuth();

  async function list(filters: AdminUserFilters = {}) {
    const response = await auth.authFetch<{
      data?: unknown[];
      meta?: AdminPaginationMeta;
    }>("/api/admin-management/users", {
      query: {
        search: filters.search || undefined,
        role: filters.role && filters.role !== "all" ? filters.role : undefined,
        status:
          filters.status && filters.status !== "all"
            ? filters.status
            : undefined,
        profileStatus:
          filters.profileStatus && filters.profileStatus !== "all"
            ? filters.profileStatus
            : undefined,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
      },
    });

    const data = Array.isArray(response?.data)
      ? response.data.map(normalizeAdminUserRecord)
      : [];

    return {
      data,
      meta: normalizePaginationMeta(response?.meta, data.length),
    };
  }

  async function get(id: number) {
    const response = await auth.authFetch<{ data?: unknown }>(
      `/api/admin-management/users/${id}`,
    );
    return normalizeAdminUserRecord(response?.data);
  }

  async function create(input: CreateAdminUserInput) {
    const response = await auth.authFetch<{ data?: unknown }>(
      "/api/admin-management/users",
      {
        method: "POST",
        body: { data: input },
      },
    );
    return normalizeAdminUserRecord(response?.data);
  }

  async function update(
    id: number,
    input: Pick<CreateAdminUserInput, "username" | "email">,
  ) {
    const response = await auth.authFetch<{ data?: unknown }>(
      `/api/admin-management/users/${id}`,
      {
        method: "PATCH",
        body: { data: input },
      },
    );
    return normalizeAdminUserRecord(response?.data);
  }

  async function changeStatus(
    id: number,
    input: { blocked?: boolean; confirmed?: boolean; reason: string },
  ) {
    const response = await auth.authFetch<{ data?: unknown }>(
      `/api/admin-management/users/${id}/status`,
      {
        method: "PATCH",
        body: { data: input },
      },
    );
    return normalizeAdminUserRecord(response?.data);
  }

  async function assignRole(id: number, roleId: number) {
    const response = await auth.authFetch<{ data?: unknown }>(
      `/api/admin-management/users/${id}/role`,
      {
        method: "PATCH",
        body: { data: { roleId } },
      },
    );
    return normalizeAdminUserRecord(response?.data);
  }

  return {
    list,
    get,
    create,
    update,
    changeStatus,
    assignRole,
  };
}
