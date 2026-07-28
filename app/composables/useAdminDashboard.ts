export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  unconfirmedUsers: number;
  totalRoles: number;
  totalLibrarians: number;
  activeLibrarians: number;
  totalStudents: number;
  totalFaculty: number;
  totalBooks: number;
  totalCopies: number;
  borrowedCopies: number;
  overdueTransactions: number;
  pendingReservations: number;
  visitorsToday: number;
}

export interface AdminRecentActivity {
  id: number;
  documentId?: string;
  action: string;
  description: string;
  actor: string;
  role?: string | null;
  outcome: "Success" | "Failure";
  createdAt: string;
}

export interface AdminDashboardData {
  generatedAt: string;
  metrics: AdminDashboardMetrics;
  system: {
    api: string;
    database: string;
    authentication: string;
    timezone: string;
  };
  recentActivity: AdminRecentActivity[];
}

const emptyMetrics = (): AdminDashboardMetrics => ({
  totalUsers: 0,
  activeUsers: 0,
  blockedUsers: 0,
  unconfirmedUsers: 0,
  totalRoles: 0,
  totalLibrarians: 0,
  activeLibrarians: 0,
  totalStudents: 0,
  totalFaculty: 0,
  totalBooks: 0,
  totalCopies: 0,
  borrowedCopies: 0,
  overdueTransactions: 0,
  pendingReservations: 0,
  visitorsToday: 0,
});

export function useAdminDashboard() {
  const auth = useAuth();
  const data = useState<AdminDashboardData>(
    "admin-dashboard-data",
    () => ({
      generatedAt: "",
      metrics: emptyMetrics(),
      system: {
        api: "Checking",
        database: "Checking",
        authentication: "Checking",
        timezone: "Asia/Manila",
      },
      recentActivity: [],
    }),
  );
  const loading = useState<boolean>("admin-dashboard-loading", () => false);
  const error = useState<string>("admin-dashboard-error", () => "");

  async function refresh() {
    if (loading.value) return;

    loading.value = true;
    error.value = "";

    try {
      const response = await auth.authFetch<{ data: AdminDashboardData }>(
        "/api/admin-management/dashboard",
      );
      data.value = response.data;
    } catch (caught) {
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  return {
    data,
    metrics: computed(() => data.value.metrics),
    system: computed(() => data.value.system),
    recentActivity: computed(() => data.value.recentActivity),
    loading,
    error,
    refresh,
  };
}
