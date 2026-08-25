export interface AdminSystemHealth {
  backend: {
    status: string;
    uptimeSeconds: number;
    environment: string;
    nodeVersion: string;
  };
  database: {
    status: string;
    latencyMs: number;
    client: string;
  };
  storage: {
    status: string;
    writable: boolean;
    totalBytes: number | null;
    freeBytes: number | null;
  };
  backup: {
    configured: boolean;
    available: boolean;
    createdAt: string | null;
    verifiedAt: string | null;
    status: string;
    databaseBytes: number | null;
    mediaFileCount: number;
    reference: string | null;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    reason: string;
    expectedEndAt: string | null;
    startedAt: string | null;
    startedBy: string | null;
    settingsVersion: number;
    updatedAt: string | null;
  };
  generatedAt: string;
}

export function useAdminSystem() {
  const auth = useAuth();
  const health = useState<AdminSystemHealth | null>("admin-system-health", () => null);
  const loading = useState<boolean>("admin-system-health-loading", () => false);
  const saving = useState<boolean>("admin-system-maintenance-saving", () => false);
  const error = useState<string>("admin-system-health-error", () => "");

  async function refresh() {
    loading.value = true;
    error.value = "";
    try {
      const response = await auth.authFetch<{ data: AdminSystemHealth }>(
        "/api/admin-system/health",
        { method: "GET", cache: "no-store", query: { timestamp: Date.now() } },
      );
      health.value = response.data;
      return response.data;
    } catch (caught) {
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function updateMaintenance(input: {
    enabled: boolean;
    message: string;
    reason: string;
    expectedEndAt: string | null;
    settingsVersion: number;
  }) {
    saving.value = true;
    try {
      const response = await auth.authFetch<{ data: AdminSystemHealth["maintenance"] }>(
        "/api/admin-system/maintenance",
        { method: "PATCH", body: input },
      );
      if (health.value) {
        health.value = { ...health.value, maintenance: response.data };
      }
      const publicMaintenance = useSystemMaintenance();
      publicMaintenance.status.value = {
        enabled: response.data.enabled,
        message: response.data.message,
        expectedEndAt: response.data.expectedEndAt,
        startedAt: response.data.startedAt,
      };
      return response.data;
    } finally {
      saving.value = false;
    }
  }

  return { health, loading, saving, error, refresh, updateMaintenance };
}
