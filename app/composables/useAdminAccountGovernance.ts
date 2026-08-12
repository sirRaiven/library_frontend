import {
  normalizeAdminLinkedProfile,
  normalizeAdminUserRecord,
  type AdminLinkedProfile,
  type AdminManagedProfileType,
  type AdminPaginationMeta,
  type AdminUserRecord,
} from "~/composables/useAdminUsers";

export interface AdminProfileCandidate extends AdminLinkedProfile {
  linkedAccount?: {
    id: number;
    username: string;
    email: string;
  } | null;
}

export interface AdminAccountsReviewSummary {
  accountsMissingProfile: number;
  roleOrProfileMismatch: number;
  studentProfilesWithoutAccount: number;
  facultyProfilesWithoutAccount: number;
  librarianProfilesWithoutAccount: number;
}

export interface AdminAccountsReviewResponse<T> {
  data: T[];
  summary: AdminAccountsReviewSummary;
  section: "accounts" | "profiles";
  meta: AdminPaginationMeta;
}

export interface CreateProfileAccountInput {
  profileType: AdminManagedProfileType;
  profileDocumentId: string;
  username: string;
  email: string;
  password: string;
  confirmed?: boolean;
}

function safeSummary(value: unknown): AdminAccountsReviewSummary {
  const summary = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};

  return {
    accountsMissingProfile: Number(summary.accountsMissingProfile || 0),
    roleOrProfileMismatch: Number(summary.roleOrProfileMismatch || 0),
    studentProfilesWithoutAccount: Number(summary.studentProfilesWithoutAccount || 0),
    facultyProfilesWithoutAccount: Number(summary.facultyProfilesWithoutAccount || 0),
    librarianProfilesWithoutAccount: Number(summary.librarianProfilesWithoutAccount || 0),
  };
}

function safeMeta(value: unknown, total: number): AdminPaginationMeta {
  const meta = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const page = Math.max(1, Number(meta.page || 1));
  const pageSize = Math.max(1, Number(meta.pageSize || 25));
  const resolvedTotal = Math.max(0, Number(meta.total ?? total));

  return {
    page,
    pageSize,
    pageCount: Math.max(1, Number(meta.pageCount || Math.ceil(resolvedTotal / pageSize) || 1)),
    total: resolvedTotal,
  };
}

function normalizeCandidate(value: unknown): AdminProfileCandidate | null {
  const profile = normalizeAdminLinkedProfile(value);
  if (!profile) return null;

  const source = value as Record<string, any>;
  const linked = source?.linkedAccount;

  return {
    ...profile,
    linkedAccount: linked && typeof linked === "object"
      ? {
          id: Number(linked.id || 0),
          username: String(linked.username || "Unnamed account"),
          email: String(linked.email || "No email recorded"),
        }
      : null,
  };
}

export function useAdminAccountGovernance() {
  const auth = useAuth();

  async function listProfileCandidates(input: {
    profileType: AdminManagedProfileType;
    search?: string;
    includeUserId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const response = await auth.authFetch<{
      data?: unknown[];
      meta?: AdminPaginationMeta;
    }>("/api/admin-management/profile-candidates", {
      query: {
        profileType: input.profileType,
        search: input.search || undefined,
        includeUserId: input.includeUserId || undefined,
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 25,
      },
    });

    const data = Array.isArray(response?.data)
      ? response.data
          .map(normalizeCandidate)
          .filter((profile): profile is AdminProfileCandidate => Boolean(profile))
      : [];

    return {
      data,
      meta: safeMeta(response?.meta, data.length),
    };
  }

  async function linkProfile(
    userId: number,
    input: {
      profileType: AdminManagedProfileType;
      profileDocumentId: string;
      reason: string;
    },
  ) {
    const response = await auth.authFetch<{ data?: unknown }>(
      `/api/admin-management/users/${userId}/profile`,
      {
        method: "PATCH",
        body: { data: input },
      },
    );
    return normalizeAdminUserRecord(response?.data);
  }

  async function unlinkProfile(userId: number, reason: string) {
    const response = await auth.authFetch<{ data?: unknown }>(
      `/api/admin-management/users/${userId}/profile`,
      {
        method: "PATCH",
        body: {
          data: {
            unlink: true,
            reason,
          },
        },
      },
    );
    return normalizeAdminUserRecord(response?.data);
  }

  async function createProfileAccount(input: CreateProfileAccountInput) {
    const response = await auth.authFetch<{ data?: unknown }>(
      "/api/admin-management/profile-accounts",
      {
        method: "POST",
        body: { data: input },
      },
    );
    return normalizeAdminUserRecord(response?.data);
  }

  async function review<T extends AdminUserRecord | AdminLinkedProfile>(input: {
    section: "accounts" | "profiles";
    search?: string;
    profileType?: "All" | AdminManagedProfileType;
    page?: number;
    pageSize?: number;
  }): Promise<AdminAccountsReviewResponse<T>> {
    const response = await auth.authFetch<{
      data?: unknown[];
      summary?: AdminAccountsReviewSummary;
      section?: "accounts" | "profiles";
      meta?: AdminPaginationMeta;
    }>("/api/admin-management/accounts-review", {
      query: {
        section: input.section,
        search: input.search || undefined,
        profileType:
          input.profileType && input.profileType !== "All"
            ? input.profileType
            : undefined,
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 25,
      },
    });

    const rawData = Array.isArray(response?.data) ? response.data : [];
    const data = input.section === "accounts"
      ? rawData.map(normalizeAdminUserRecord)
      : rawData
          .map(normalizeAdminLinkedProfile)
          .filter((profile): profile is AdminLinkedProfile => Boolean(profile));

    return {
      data: data as T[],
      summary: safeSummary(response?.summary),
      section: response?.section === "profiles" ? "profiles" : input.section,
      meta: safeMeta(response?.meta, data.length),
    };
  }

  return {
    listProfileCandidates,
    linkProfile,
    unlinkProfile,
    createProfileAccount,
    review,
  };
}
