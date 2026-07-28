import type {
  AdminPaginationMeta,
  AdminUserRecord,
} from "~/composables/useAdminUsers";

export interface AdminLibrarianRecord {
  id: number;
  documentId: string;
  employeeNo: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  email: string;
  contactNo?: string | null;
  position: "Head Librarian" | "Assistant Librarian" | "Staff";
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
  account: AdminUserRecord | null;
}

export interface CreateAdminLibrarianInput {
  employeeNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  contactNo?: string;
  position: AdminLibrarianRecord["position"];
  username: string;
  password: string;
}

export function useAdminLibrarians() {
  const auth = useAuth();

  async function list(filters: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    return await auth.authFetch<{
      data: AdminLibrarianRecord[];
      meta: AdminPaginationMeta;
    }>("/api/admin-management/librarians", {
      query: {
        search: filters.search || undefined,
        status:
          filters.status && filters.status !== "All"
            ? filters.status
            : undefined,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
      },
    });
  }

  async function create(input: CreateAdminLibrarianInput) {
    const response = await auth.authFetch<{ data: AdminLibrarianRecord }>(
      "/api/admin-management/librarians",
      {
        method: "POST",
        body: { data: input },
      },
    );
    return response.data;
  }

  async function update(
    documentId: string,
    input: Partial<CreateAdminLibrarianInput> & {
      status?: "Active" | "Inactive";
    },
  ) {
    const response = await auth.authFetch<{ data: AdminLibrarianRecord }>(
      `/api/admin-management/librarians/${documentId}`,
      {
        method: "PATCH",
        body: { data: input },
      },
    );
    return response.data;
  }

  return { list, create, update };
}
