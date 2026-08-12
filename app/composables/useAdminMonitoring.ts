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

export interface AdminUserMonitoringSummary {
  generatedAt: string;
  account: MonitoringAccount;
  profileType: "Student" | "Faculty" | "Librarian" | "Administrator" | string;
  accountStatus: "Active" | "Blocked" | "Unconfirmed" | string;
  activityThirtyDays: number;
  failedOrDeniedThirtyDays: number;
  activeAuthenticationSessions: number;
  activeTrackedSessions: number;
  knownDevices: number;
  trustedDevices: number;
  blockedDevices: number;
  lastSuccessfulLoginAt: string | null;
  lastFailedOrDeniedAt: string | null;
  lastSeenAt: string | null;
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

export type AdminMonitoringReportType =
  | "login-history"
  | "failed-access"
  | "active-session-register"
  | "device-register"
  | "session-revocations"
  | "new-device-register";

export interface AdminMonitoringReportColumn {
  key: string;
  label: string;
}

export interface AdminMonitoringReport {
  reportType: AdminMonitoringReportType;
  title: string;
  generatedAt: string;
  total: number;
  returned: number;
  truncated: boolean;
  filters: {
    dateFrom: string;
    dateTo: string;
    profileType: string | null;
    userId: number | null;
  };
  columns: AdminMonitoringReportColumn[];
  rows: Array<Record<string, string | number | boolean | null>>;
}

interface PagedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; pageCount: number; total: number };
}

function queryObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) =>
      value !== "" &&
      value !== null &&
      value !== undefined &&
      value !== "All"
    ),
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

  async function userSummary(userId: number) {
    const response = await auth.authFetch<{
      data: AdminUserMonitoringSummary;
    }>(`/api/admin-monitoring/users/${userId}/summary`);
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

  async function report(
    reportType: AdminMonitoringReportType,
    filters: Record<string, unknown>,
  ) {
    const response = await auth.authFetch<{ data: AdminMonitoringReport }>(
      `/api/admin-monitoring/reports/${reportType}`,
      { query: queryObject(filters) },
    );
    return response.data;
  }

  async function revokeSession(session: AdminSessionRecord, reason: string) {
    const path = session.source === "Authentication Session"
      ? `/api/admin-monitoring/auth-sessions/${session.account.id}/${encodeURIComponent(session.id)}/revoke`
      : `/api/admin-monitoring/tracked-sessions/${encodeURIComponent(session.id)}/revoke`;
    return await auth.authFetch<{
      data: { revoked: boolean; sessionReference: string };
    }>(path, {
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

  return {
    summary,
    userSummary,
    activity,
    sessions,
    devices,
    report,
    revokeSession,
    deviceAction,
  };
}
