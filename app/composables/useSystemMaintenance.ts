export interface SystemMaintenanceStatus {
  enabled: boolean;
  message: string;
  expectedEndAt: string | null;
  startedAt: string | null;
}

const DEFAULT_STATUS: SystemMaintenanceStatus = {
  enabled: false,
  message:
    "The system is under maintenance. Only viewing of information is currently available.",
  expectedEndAt: null,
  startedAt: null,
};

export function useSystemMaintenance() {
  const config = useRuntimeConfig();
  const apiBase = String(config.public.strapiUrl || "").replace(/\/+$/, "");
  const status = useState<SystemMaintenanceStatus>(
    "system-maintenance-status",
    () => ({ ...DEFAULT_STATUS }),
  );
  const initialized = useState<boolean>("system-maintenance-initialized", () => false);
  const loading = useState<boolean>("system-maintenance-loading", () => false);
  const error = useState<string>("system-maintenance-error", () => "");

  const enabled = computed(() => Boolean(status.value.enabled));

  async function refresh() {
    if (loading.value) return status.value;
    loading.value = true;
    error.value = "";
    try {
      const response = await $fetch<{ data: SystemMaintenanceStatus }>(
        `${apiBase}/api/system-status/maintenance`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          query: { timestamp: Date.now() },
        },
      );
      status.value = {
        ...DEFAULT_STATUS,
        ...(response.data ?? {}),
      };
      initialized.value = true;
      return status.value;
    } catch (caught) {
      error.value = "Maintenance status is temporarily unavailable.";
      initialized.value = true;
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  function applyReadOnlyError(caught: unknown) {
    const candidate = caught as any;
    const code = String(
      candidate?.data?.error?.details?.code ??
        candidate?.response?._data?.error?.details?.code ??
        "",
    );
    if (code !== "SYSTEM_MAINTENANCE_READ_ONLY") return false;

    const message = String(
      candidate?.data?.error?.message ??
        candidate?.response?._data?.error?.message ??
        DEFAULT_STATUS.message,
    );
    const expectedEndAt =
      candidate?.data?.error?.details?.expectedEndAt ??
      candidate?.response?._data?.error?.details?.expectedEndAt ??
      null;

    status.value = {
      ...status.value,
      enabled: true,
      message,
      expectedEndAt,
    };
    return true;
  }

  return {
    status,
    enabled,
    initialized,
    loading,
    error,
    refresh,
    applyReadOnlyError,
  };
}
