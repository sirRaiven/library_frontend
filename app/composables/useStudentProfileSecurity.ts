export interface StudentSecurityProfile {
  documentId: string;
  studentNo: string;
  libraryCardNo: string | null;
  fullName: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  sex: string | null;
  educationalLevel: string;
  course: string;
  yearLevel: number | null;
  section: string | null;
  email: string | null;
  contactNo: string | null;
  address: string | null;
  photoUrl: string | null;
  studentStatus: string;
  libraryCardStatus: string;
}

export interface StudentAuthSession {
  id: string;
  deviceId?: string;
  deviceName?: string;
  current: boolean;
  loginAt?: string;
  lastActiveAt?: string;
}

export interface StudentKnownDevice {
  documentId: string;
  displayName: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  browserVersion: string | null;
  applicationMode: string;
  trusted: boolean;
  blocked: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  lastIpAddress: string | null;
  current: boolean;
}

export interface StudentProfileSecurityData {
  generatedAt: string;
  profile: StudentSecurityProfile;
  account: {
    username: string;
    email: string;
    confirmed: boolean;
    blocked: boolean;
    provider: string;
  };
  security: {
    authSessionManagementAvailable: boolean;
    sessions: StudentAuthSession[];
    devices: StudentKnownDevice[];
    summary: {
      activeSessions: number;
      knownDevices: number;
      trustedDevices: number;
      blockedDevices: number;
    };
  };
}

function initialData(): StudentProfileSecurityData | null {
  return null;
}

export function useStudentProfileSecurity() {
  const auth = useAuth();
  const monitoring = useStudentSession();
  const data = useState<StudentProfileSecurityData | null>(
    "student-profile-security-data",
    initialData,
  );
  const loading = useState("student-profile-security-loading", () => false);
  const saving = useState("student-profile-security-saving", () => false);
  const securityAction = useState("student-profile-security-action", () => "");
  const error = useState("student-profile-security-error", () => "");

  function headers() {
    const result = new Headers();
    if (monitoring.sessionKey.value) {
      result.set("X-Student-Session", monitoring.sessionKey.value);
    }
    return result;
  }

  async function refresh() {
    if (loading.value) return;
    loading.value = true;
    error.value = "";
    try {
      await monitoring.start();
      const response = await auth.authFetch<{ data: StudentProfileSecurityData }>(
        "/api/student-portal/profile-security",
        { headers: headers() },
      );
      data.value = response.data;
      return response.data;
    } catch (caught) {
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(input: { contactNo: string; address: string }) {
    saving.value = true;
    try {
      const response = await auth.authFetch<{
        data: { contactNo: string | null; address: string | null; updatedAt: string };
      }>("/api/student-portal/profile", {
        method: "PATCH",
        headers: headers(),
        body: { data: input },
      });
      if (data.value) {
        data.value.profile.contactNo = response.data.contactNo;
        data.value.profile.address = response.data.address;
      }
      return response.data;
    } finally {
      saving.value = false;
    }
  }

  async function changePassword(input: {
    currentPassword: string;
    password: string;
    passwordConfirmation: string;
  }) {
    securityAction.value = "password";
    try {
      return await auth.authFetch<{
        data: { changed: boolean; requiresSignIn: boolean };
      }>("/api/student-portal/security/change-password", {
        method: "POST",
        headers: headers(),
        body: { data: input },
      });
    } finally {
      securityAction.value = "";
    }
  }

  async function revokeSession(sessionId: string) {
    securityAction.value = `session:${sessionId}`;
    try {
      await auth.authFetch(
        `/api/student-portal/security/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE", headers: headers() },
      );
      await refresh();
    } finally {
      securityAction.value = "";
    }
  }

  async function revokeOtherSessions() {
    securityAction.value = "sessions:others";
    try {
      const response = await auth.authFetch<{ data: { revoked: number } }>(
        "/api/student-portal/security/sessions/revoke-others",
        { method: "POST", headers: headers() },
      );
      await refresh();
      return response.data;
    } finally {
      securityAction.value = "";
    }
  }

  async function setDeviceTrust(device: StudentKnownDevice, trusted: boolean) {
    securityAction.value = `device:${device.documentId}`;
    try {
      const action = trusted ? "trust" : "untrust";
      const response = await auth.authFetch<{ data: StudentKnownDevice }>(
        `/api/student-portal/security/devices/${device.documentId}/${action}`,
        { method: "PATCH", headers: headers() },
      );
      if (data.value) {
        const index = data.value.security.devices.findIndex(
          item => item.documentId === device.documentId,
        );
        if (index >= 0) {
          data.value.security.devices[index] = {
            ...response.data,
            current: device.current,
          };
        }
        data.value.security.summary.trustedDevices =
          data.value.security.devices.filter(item => item.trusted).length;
      }
      return response.data;
    } finally {
      securityAction.value = "";
    }
  }

  return {
    data,
    profile: computed(() => data.value?.profile ?? null),
    account: computed(() => data.value?.account ?? null),
    sessions: computed(() => data.value?.security.sessions ?? []),
    devices: computed(() => data.value?.security.devices ?? []),
    summary: computed(() => data.value?.security.summary ?? {
      activeSessions: 0,
      knownDevices: 0,
      trustedDevices: 0,
      blockedDevices: 0,
    }),
    sessionManagementAvailable: computed(
      () => data.value?.security.authSessionManagementAvailable ?? false,
    ),
    loading,
    saving,
    securityAction,
    error,
    refresh,
    updateProfile,
    changePassword,
    revokeSession,
    revokeOtherSessions,
    setDeviceTrust,
  };
}
