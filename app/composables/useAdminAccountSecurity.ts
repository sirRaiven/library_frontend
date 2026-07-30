export interface AdminAuthenticationSession {
  id: string;
  deviceId?: string;
  deviceName?: string;
  current: boolean;
  loginAt?: string;
  lastActiveAt?: string;
}

export interface AdminTrackedSession {
  id: number;
  documentId: string;
  sessionKeyReference: string;
  status: string;
  loginAt: string | null;
  lastActivityAt: string | null;
  logoutAt: string | null;
  logoutReason: string | null;
  applicationMode: string;
  maskedIpAddress: string | null;
  device: AdminKnownDevice | null;
}

export interface AdminKnownDevice {
  id: number;
  documentId: string;
  displayName: string;
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
  source?: "Portal Monitoring" | "Authentication Session" | "Portal Monitoring + Authentication Session";
  activeSessionCount?: number;
}

export interface AdminSecurityActivity {
  id: number;
  eventCode: string;
  category: string;
  description: string;
  outcome: string;
  occurredAt: string | null;
  route: string | null;
  maskedIpAddress: string | null;
}

export interface AdminAccountSecurityData {
  generatedAt: string;
  account: {
    id: number;
    username: string;
    email: string;
    role: {
      id: number;
      name: string;
      type: string;
    } | null;
    confirmed: boolean;
    blocked: boolean;
  };
  sessionManagementAvailable: boolean;
  summary: {
    activeAuthenticationSessions: number;
    activeTrackedSessions: number;
    knownDevices: number;
    registeredDevices: number;
    sessionDerivedDevices: number;
    trustedDevices: number;
    blockedDevices: number;
    lastSuccessfulLoginAt: string | null;
    lastFailedLoginAt: string | null;
    failedLoginCount30Days: number;
  };
  authenticationSessions: AdminAuthenticationSession[];
  trackedSessions: AdminTrackedSession[];
  devices: AdminKnownDevice[];
  recentSecurityActivity: AdminSecurityActivity[];
}

function emptySecurity(userId = 0): AdminAccountSecurityData {
  return {
    generatedAt: new Date(0).toISOString(),
    account: {
      id: userId,
      username: "Unknown account",
      email: "",
      role: null,
      confirmed: false,
      blocked: false,
    },
    sessionManagementAvailable: false,
    summary: {
      activeAuthenticationSessions: 0,
      activeTrackedSessions: 0,
      knownDevices: 0,
      registeredDevices: 0,
      sessionDerivedDevices: 0,
      trustedDevices: 0,
      blockedDevices: 0,
      lastSuccessfulLoginAt: null,
      lastFailedLoginAt: null,
      failedLoginCount30Days: 0,
    },
    authenticationSessions: [],
    trackedSessions: [],
    devices: [],
    recentSecurityActivity: [],
  };
}

function normalizeSecurity(value: unknown, userId = 0): AdminAccountSecurityData {
  if (!value || typeof value !== "object") return emptySecurity(userId);
  const input = value as Record<string, any>;
  const fallback = emptySecurity(userId);
  const summary = input.summary && typeof input.summary === "object"
    ? input.summary
    : {};

  return {
    ...fallback,
    ...input,
    account: {
      ...fallback.account,
      ...(input.account || {}),
      id: Number(input.account?.id || userId),
    },
    sessionManagementAvailable: Boolean(input.sessionManagementAvailable),
    summary: {
      activeAuthenticationSessions: Number(summary.activeAuthenticationSessions || 0),
      activeTrackedSessions: Number(summary.activeTrackedSessions || 0),
      knownDevices: Number(summary.knownDevices || 0),
      registeredDevices: Number(summary.registeredDevices || 0),
      sessionDerivedDevices: Number(summary.sessionDerivedDevices || 0),
      trustedDevices: Number(summary.trustedDevices || 0),
      blockedDevices: Number(summary.blockedDevices || 0),
      lastSuccessfulLoginAt: summary.lastSuccessfulLoginAt || null,
      lastFailedLoginAt: summary.lastFailedLoginAt || null,
      failedLoginCount30Days: Number(summary.failedLoginCount30Days || 0),
    },
    authenticationSessions: Array.isArray(input.authenticationSessions)
      ? input.authenticationSessions.map((session: any) => ({
          id: String(session?.id || ""),
          deviceId: session?.deviceId ? String(session.deviceId) : undefined,
          deviceName: session?.deviceName ? String(session.deviceName) : undefined,
          current: Boolean(session?.current),
          loginAt: session?.loginAt || undefined,
          lastActiveAt: session?.lastActiveAt || undefined,
        })).filter((session: AdminAuthenticationSession) => Boolean(session.id))
      : [],
    trackedSessions: Array.isArray(input.trackedSessions)
      ? input.trackedSessions
      : [],
    devices: Array.isArray(input.devices)
      ? input.devices.map((device: any) => ({
          id: Number(device?.id || 0),
          documentId: String(device?.documentId || ""),
          displayName: String(device?.displayName || "Unknown device"),
          deviceType: String(device?.deviceType || "Unknown Device"),
          operatingSystem: String(device?.operatingSystem || "Unknown OS"),
          browser: String(device?.browser || "Unknown Browser"),
          browserVersion: device?.browserVersion ? String(device.browserVersion) : null,
          applicationMode: String(device?.applicationMode || "Unknown"),
          trusted: Boolean(device?.trusted),
          blocked: Boolean(device?.blocked),
          firstSeenAt: device?.firstSeenAt || null,
          lastSeenAt: device?.lastSeenAt || null,
          maskedIpAddress: device?.maskedIpAddress || null,
          source: device?.source || "Portal Monitoring",
          activeSessionCount: Number(device?.activeSessionCount || 0),
        }))
      : [],
    recentSecurityActivity: Array.isArray(input.recentSecurityActivity)
      ? input.recentSecurityActivity
      : [],
  };
}

export function useAdminAccountSecurity() {
  const auth = useAuth();

  async function get(userId: number) {
    const response = await auth.authFetch<{ data?: unknown }>(
      `/api/admin-management/users/${userId}/security`,
    );
    return normalizeSecurity(response?.data, userId);
  }

  async function revokeSession(
    userId: number,
    sessionId: string,
    reason: string,
  ) {
    const response = await auth.authFetch<{
      data?: { security?: unknown };
    }>(
      `/api/admin-management/users/${userId}/sessions/${encodeURIComponent(sessionId)}/revoke`,
      {
        method: "POST",
        body: { data: { reason } },
      },
    );
    return normalizeSecurity(response?.data?.security, userId);
  }

  async function revokeAllSessions(userId: number, reason: string) {
    const response = await auth.authFetch<{
      data?: {
        revokedAuthenticationSessions?: number;
        invalidatedTrackedSessions?: number;
        currentAdministratorSessionPreserved?: boolean;
        security?: unknown;
      };
    }>(`/api/admin-management/users/${userId}/sessions/revoke-all`, {
      method: "POST",
      body: { data: { reason } },
    });

    return {
      revokedAuthenticationSessions: Number(
        response?.data?.revokedAuthenticationSessions || 0,
      ),
      invalidatedTrackedSessions: Number(
        response?.data?.invalidatedTrackedSessions || 0,
      ),
      currentAdministratorSessionPreserved: Boolean(
        response?.data?.currentAdministratorSessionPreserved,
      ),
      security: normalizeSecurity(response?.data?.security, userId),
    };
  }

  async function resetPassword(
    userId: number,
    input: { temporaryPassword: string; reason: string },
  ) {
    const response = await auth.authFetch<{
      data?: {
        reset?: boolean;
        requiresSignIn?: boolean;
        revokedAuthenticationSessions?: number;
        invalidatedTrackedSessions?: number;
      };
    }>(`/api/admin-management/users/${userId}/password-reset`, {
      method: "POST",
      body: { data: input },
    });

    return {
      reset: Boolean(response?.data?.reset),
      requiresSignIn: Boolean(response?.data?.requiresSignIn),
      revokedAuthenticationSessions: Number(
        response?.data?.revokedAuthenticationSessions || 0,
      ),
      invalidatedTrackedSessions: Number(
        response?.data?.invalidatedTrackedSessions || 0,
      ),
    };
  }

  return {
    get,
    revokeSession,
    revokeAllSessions,
    resetPassword,
  };
}
