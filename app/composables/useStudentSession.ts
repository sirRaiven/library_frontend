import { appLogger } from "~/utils/app-logger";

export interface StudentSessionDevice {
  deviceKey: string;
  displayName: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  applicationMode: string;
  trusted: boolean;
}

export interface StudentSessionData {
  sessionKey: string;
  status: string;
  loginAt: string;
  lastActivityAt: string;
  resumed: boolean;
  device: StudentSessionDevice;
}

let activeStartRequest: Promise<StudentSessionData | null> | null = null;

function randomIdentifier(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const random = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");

  return `${Date.now().toString(36)}-${random}`;
}

function applicationMode(): string {
  if (!import.meta.client) return "Unknown";

  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  if (standalone) return "Installed PWA";
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return "Mobile Browser";
  }

  return "Web Browser";
}

export function useStudentSession() {
  const auth = useAuth();

  const deviceKey = useCookie<string | null>("sncbt-device-id", {
    default: () => null,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 365,
  });

  const sessionKey = useCookie<string | null>("sncbt-student-session", {
    default: () => null,
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });

  const data = useState<StudentSessionData | null>(
    "student-session-data",
    () => null,
  );
  const starting = useState<boolean>("student-session-starting", () => false);
  const error = useState<string>("student-session-error", () => "");
  const lastTouch = useState<number>("student-session-last-touch", () => 0);

  function ensureDeviceKey(): string {
    if (!deviceKey.value) {
      deviceKey.value = randomIdentifier();
    }

    return deviceKey.value;
  }

  async function performStart(): Promise<StudentSessionData | null> {
    if (!import.meta.client || !auth.isStudent.value) return null;

    starting.value = true;
    error.value = "";

    try {
      const response = await auth.authFetch<{ data: StudentSessionData }>(
        "/api/student-portal/session/start",
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
      lastTouch.value = Date.now();
      return response.data;
    } catch (caught) {
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      starting.value = false;
    }
  }

  async function start(): Promise<StudentSessionData | null> {
    if (!activeStartRequest) {
      activeStartRequest = performStart().finally(() => {
        activeStartRequest = null;
      });
    }

    return await activeStartRequest;
  }

  async function touch(force = false): Promise<void> {
    if (!import.meta.client || !auth.isStudent.value || !sessionKey.value) {
      return;
    }

    const now = Date.now();

    if (!force && now - lastTouch.value < 12_000) {
      return;
    }

    try {
      const response = await auth.authFetch<{
        data: Pick<StudentSessionData, "sessionKey" | "status" | "loginAt" | "lastActivityAt">;
      }>("/api/student-portal/session/touch", {
        method: "POST",
        body: { sessionKey: sessionKey.value },
      });

      if (data.value) {
        data.value = {
          ...data.value,
          ...response.data,
        };
      }

      lastTouch.value = now;
    } catch (caught) {
      if ((caught as { statusCode?: number }).statusCode === 404) {
        sessionKey.value = null;
        data.value = null;
      }
    }
  }

  async function end(): Promise<void> {
    const key = sessionKey.value;

    try {
      if (key && auth.isStudent.value) {
        await auth.authFetch("/api/student-portal/session/end", {
          method: "POST",
          body: { sessionKey: key },
        });
      }
    } catch (caught) {
      appLogger.warn("Unable to close the Student Portal monitoring session.", caught);
    } finally {
      sessionKey.value = null;
      data.value = null;
      lastTouch.value = 0;
    }
  }

  return {
    data,
    device: computed(() => data.value?.device ?? null),
    sessionKey,
    starting,
    error,
    start,
    touch,
    end,
  };
}
