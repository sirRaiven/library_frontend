export interface AdminRoleSummary {
  id: number;
  documentId?: string;
  name: string;
  type: string;
  description?: string;
  userCount?: number;
  protected?: boolean;
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
  page?: number;
  pageSize?: number;
}

export interface CreateAdminUserInput {
  username: string;
  email: string;
  password: string;
  roleId: number;
  confirmed?: boolean;
}

export function useAdminUsers() {
  const auth = useAuth();

  async function list(filters: AdminUserFilters = {}) {
    return await auth.authFetch<{
      data: AdminUserRecord[];
      meta: AdminPaginationMeta;
    }>("/api/admin-management/users", {
      query: {
        search: filters.search || undefined,
        role: filters.role && filters.role !== "all" ? filters.role : undefined,
        status:
          filters.status && filters.status !== "all"
            ? filters.status
            : undefined,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
      },
    });
  }

  async function get(id: number) {
    const response = await auth.authFetch<{ data: AdminUserRecord }>(
      `/api/admin-management/users/${id}`,
    );
    return response.data;
  }

  async function create(input: CreateAdminUserInput) {
    const response = await auth.authFetch<{ data: AdminUserRecord }>(
      "/api/admin-management/users",
      {
        method: "POST",
        body: { data: input },
      },
    );
    return response.data;
  }

  async function update(
    id: number,
    input: Pick<CreateAdminUserInput, "username" | "email">,
  ) {
    const response = await auth.authFetch<{ data: AdminUserRecord }>(
      `/api/admin-management/users/${id}`,
      {
        method: "PATCH",
        body: { data: input },
      },
    );
    return response.data;
  }

  async function changeStatus(
    id: number,
    input: { blocked?: boolean; confirmed?: boolean },
  ) {
    const response = await auth.authFetch<{ data: AdminUserRecord }>(
      `/api/admin-management/users/${id}/status`,
      {
        method: "PATCH",
        body: { data: input },
      },
    );
    return response.data;
  }

  async function assignRole(id: number, roleId: number) {
    const response = await auth.authFetch<{ data: AdminUserRecord }>(
      `/api/admin-management/users/${id}/role`,
      {
        method: "PATCH",
        body: { data: { roleId } },
      },
    );
    return response.data;
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
