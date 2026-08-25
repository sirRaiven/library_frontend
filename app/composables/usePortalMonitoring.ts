import { appLogger } from "~/utils/app-logger";

export interface PortalMonitoringDevice {
  deviceKey: string;
  displayName: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  applicationMode: string;
  trusted: boolean;
}

export interface PortalMonitoringSession {
  sessionKey: string;
  status: string;
  loginAt: string;
  lastActivityAt: string;
  resumed: boolean;
  device: PortalMonitoringDevice;
}

let activeStartRequest: Promise<PortalMonitoringSession | null> | null = null;

function randomIdentifier(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
}

function applicationMode(): string {
  if (!import.meta.client) return "Unknown";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (standalone) return "Installed PWA";
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return "Mobile Browser";
  return "Web Browser";
}

export function usePortalMonitoring() {
  const auth = useAuth();
  const maintenance = useSystemMaintenance();
  const deviceKey = useCookie<string | null>("sncbt-device-id", {
    default: () => null,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 365,
  });
  const sessionKey = useCookie<string | null>("sncbt-portal-monitoring-session", {
    default: () => null,
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });
  const data = useState<PortalMonitoringSession | null>("portal-monitoring-session-data", () => null);
  const starting = useState<boolean>("portal-monitoring-starting", () => false);
  const error = useState<string>("portal-monitoring-error", () => "");
  const lastPageRecord = useState<string>("portal-monitoring-last-page", () => "");

  const supported = computed(() =>
    auth.isStudent.value ||
    auth.isFaculty.value ||
    auth.isLibrarian.value ||
    auth.isAdministrator.value,
  );

  function ensureDeviceKey() {
    if (!deviceKey.value) deviceKey.value = randomIdentifier();
    return deviceKey.value;
  }

  async function performStart() {
    if (!import.meta.client || !supported.value || maintenance.enabled.value) return null;
    starting.value = true;
    error.value = "";
    try {
      const response = await auth.authFetch<{ data: PortalMonitoringSession }>(
        "/api/system-monitoring/session/start",
        {
          method: "POST",
          body: {
            deviceKey: ensureDeviceKey(),
            existingSessionKey: sessionKey.value,
            applicationMode: applicationMode(),
          },
        },
      );
      data.value = response.data;
      sessionKey.value = response.data.sessionKey;
      return response.data;
    } catch (caught) {
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      starting.value = false;
    }
  }

  async function start() {
    if (!activeStartRequest) {
      activeStartRequest = performStart().finally(() => {
        activeStartRequest = null;
      });
    }
    return await activeStartRequest;
  }


  async function recordPageView(route: string, title: string) {
    if (!import.meta.client || !supported.value || maintenance.enabled.value || !route) return;
    const signature = `${sessionKey.value ?? "none"}:${route}`;
    if (lastPageRecord.value === signature) return;
    lastPageRecord.value = signature;
    try {
      await auth.authFetch("/api/system-monitoring/activity/page-view", {
        method: "POST",
        body: {
          route,
          title,
          sessionKey: sessionKey.value,
          deviceKey: ensureDeviceKey(),
        },
      });
    } catch (caught) {
      appLogger.warn("Unable to record the portal page activity.", caught);
    }
  }

  async function end() {
    const key = sessionKey.value;
    try {
      if (key && supported.value && !maintenance.enabled.value) {
        await auth.authFetch("/api/system-monitoring/session/end", {
          method: "POST",
          body: { sessionKey: key },
        });
      }
    } catch (caught) {
      appLogger.warn("Unable to close the portal-monitoring session.", caught);
    } finally {
      sessionKey.value = null;
      data.value = null;
      lastPageRecord.value = "";
    }
  }

  return {
    data,
    device: computed(() => data.value?.device ?? null),
    sessionKey,
    starting,
    error,
    supported,
    start,
    recordPageView,
    end,
  };
}
