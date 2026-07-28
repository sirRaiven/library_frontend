import type { AdminRoleSummary } from "~/composables/useAdminUsers";

export interface AdminRolePermission {
  id: number;
  documentId?: string;
  action: string;
  label: string;
}

export interface AdminRoleDetail extends AdminRoleSummary {
  userCount: number;
  protected: boolean;
  permissions: AdminRolePermission[];
}

export function useAdminRoles() {
  const auth = useAuth();

  async function list() {
    const response = await auth.authFetch<{ data: AdminRoleSummary[] }>(
      "/api/admin-management/roles",
    );
    return response.data;
  }

  async function get(id: number) {
    const response = await auth.authFetch<{ data: AdminRoleDetail }>(
      `/api/admin-management/roles/${id}`,
    );
    return response.data;
  }

  return { list, get };
}
