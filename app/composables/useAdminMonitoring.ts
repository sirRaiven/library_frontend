export interface AdminMonitoringSummary {
  generatedAt: string;
  activityToday: number;
  failedOrDeniedToday: number;
  activeAuthenticationSessions: number;
  activeTrackedSessions: number;
  suspiciousTrackedSessions: number;
  knownDevices: number;
  newDevicesSevenDays: number;
  blockedDevices: number;
}

export interface MonitoringAccount {
  id: number;
  username: string;
  email: string;
  role: { id: number; name: string; type: string } | null;
}

export interface AdminActivityRecord {
  id: number;
  documentId: string;
  eventCode: string;
  category: string;
  description: string;
  outcome: string;
  account: { id: number; username: string; role: string };
  profileType: string;
  route: string | null;
  requestMethod: string | null;
  maskedIpAddress: string | null;
  occurredAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AdminSessionRecord {
  id: string;
  source: "Authentication Session" | "Portal Monitoring";
  status: string;
  account: MonitoringAccount;
  profileType: string;
  loginAt: string | null;
  lastActivityAt: string | null;
  logoutAt: string | null;
  logoutReason: string | null;
  applicationMode: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  maskedIpAddress: string | null;
  sessionReference: string;
}

export interface AdminDeviceRecord {
  id: number;
  documentId: string;
  displayName: string;
  account: MonitoringAccount;
  profileType: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  browserVersion: string | null;
  applicationMode: string;
  trusted: boolean;
  blocked: boolean;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  maskedIpAddress: string | null;
  activeSessionCount: number;
}

interface PagedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; pageCount: number; total: number };
}

function queryObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value !== null && value !== undefined && value !== "All"),
  );
}

export function useAdminMonitoring() {
  const auth = useAuth();

  async function summary() {
    const response = await auth.authFetch<{ data: AdminMonitoringSummary }>(
      "/api/admin-monitoring/summary",
    );
    return response.data;
  }

  async function activity(filters: Record<string, unknown>) {
    return await auth.authFetch<PagedResponse<AdminActivityRecord>>(
      "/api/admin-monitoring/activity",
      { query: queryObject(filters) },
    );
  }

  async function sessions(filters: Record<string, unknown>) {
    return await auth.authFetch<PagedResponse<AdminSessionRecord>>(
      "/api/admin-monitoring/sessions",
      { query: queryObject(filters) },
    );
  }

  async function devices(filters: Record<string, unknown>) {
    return await auth.authFetch<PagedResponse<AdminDeviceRecord>>(
      "/api/admin-monitoring/devices",
      { query: queryObject(filters) },
    );
  }

  async function revokeSession(session: AdminSessionRecord, reason: string) {
    const path = session.source === "Authentication Session"
      ? `/api/admin-monitoring/auth-sessions/${session.account.id}/${encodeURIComponent(session.id)}/revoke`
      : `/api/admin-monitoring/tracked-sessions/${encodeURIComponent(session.id)}/revoke`;
    return await auth.authFetch<{ data: { revoked: boolean; sessionReference: string } }>(path, {
      method: "POST",
      body: { data: { reason } },
    });
  }

  async function deviceAction(
    device: AdminDeviceRecord,
    action: "trust" | "untrust" | "block" | "unblock" | "revoke-sessions",
    reason: string,
  ) {
    return await auth.authFetch<{
      data: {
        device: AdminDeviceRecord;
        invalidatedTrackedSessions: number;
        revokedAuthenticationSessions: number;
        authenticationRevocationScope: string;
      };
    }>(`/api/admin-monitoring/devices/${encodeURIComponent(device.documentId)}/${action}`, {
      method: "POST",
      body: { data: { reason } },
    });
  }

  return { summary, activity, sessions, devices, revokeSession, deviceAction };
}
