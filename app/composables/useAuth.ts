import { appLogger } from "~/utils/app-logger";
import { errorCode, errorStatus, userFacingErrorMessage } from "~/utils/user-facing-error";

interface StrapiRole {
  id: number;
  documentId?: string;
  name: string;
  type: string;
}

interface StrapiRoleRelation {
  data?: StrapiRole | null;
}

type RawStrapiRole = StrapiRole | StrapiRoleRelation | null | undefined;

interface RawAuthUser {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  provider: string;
  role?: RawStrapiRole;
}

export interface AuthUser {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  provider: string;
  role: StrapiRole | null;
}

interface LoginResponse {
  jwt: string;
  user: RawAuthUser;
}

interface RefreshResponse {
  jwt: string;
}

export type ApplicationRole =
  | "super-administrator"
  | "administrator"
  | "librarian"
  | "student"
  | "faculty"
  | "authenticated"
  | null;

interface AuthFetchOptions {
  method?:
    | "GET"
    | "HEAD"
    | "PATCH"
    | "POST"
    | "PUT"
    | "DELETE"
    | "CONNECT"
    | "OPTIONS"
    | "TRACE";
  body?: Record<string, unknown> | null;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: HeadersInit;
  cache?: RequestCache;
}

let activeRefreshRequest: Promise<boolean> | null = null;
const activeGetRequests = new Map<string, Promise<unknown>>();

function stableRequestValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableRequestValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "timestamp" && key !== "_refresh")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableRequestValue(entry)]),
    );
  }

  return value;
}

function requestDedupeKey(
  requestUrl: string,
  options: AuthFetchOptions,
): string {
  const headers = new Headers(options.headers);
  const normalizedHeaders = [...headers.entries()]
    .sort(([left], [right]) => left.localeCompare(right));

  return JSON.stringify({
    url: requestUrl,
    query: stableRequestValue(options.query ?? {}),
    params: stableRequestValue(options.params ?? {}),
    headers: normalizedHeaders,
  });
}

const DEVICE_BLOCKED_STATUS = 423;

function randomDeviceIdentifier(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const random = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");

  return `${Date.now().toString(36)}-${random}`;
}

function getHttpStatus(error: unknown): number | undefined {
  return errorStatus(error);
}

function getErrorCode(error: unknown): string {
  return errorCode(error);
}

function getErrorMessage(error: unknown): string {
  return userFacingErrorMessage(
    error,
    "The request could not be completed. Please try again.",
  );
}

function unwrapRole(role: RawStrapiRole): StrapiRole | null {
  if (!role) {
    return null;
  }

  if ("data" in role) {
    return role.data ?? null;
  }

  // At this point, role is not a relation wrapper, so treat it as StrapiRole
  return role as StrapiRole;
}

function normalizeUser(user: RawAuthUser): AuthUser {
  return {
    ...user,
    role: unwrapRole(user.role),
  };
}

function normalizeRole(role?: StrapiRole | null): ApplicationRole {
  const roleCandidates = [
    role?.type,
    role?.name,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(value =>
      value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-"),
    );

  if (
    roleCandidates.includes("super-administrator") ||
    roleCandidates.includes("super-admin")
  ) {
    return "super-administrator";
  }

  if (
    roleCandidates.includes("administrator") ||
    roleCandidates.includes("system-administrator") ||
    roleCandidates.includes("admin")
  ) {
    return "administrator";
  }

  for (const supportedRole of [
    "librarian",
    "student",
    "faculty",
    "authenticated",
  ] as const) {
    if (roleCandidates.includes(supportedRole)) {
      return supportedRole;
    }
  }

  return null;
}

export function useAuth() {
  const config = useRuntimeConfig();

  const strapiUrl = String(config.public.strapiUrl).replace(/\/$/, "");

  const accessToken = useState<string | null>("auth-access-token", () => null);

  const user = useState<AuthUser | null>("auth-user", () => null);

  const initialized = useState<boolean>("auth-initialized", () => false);

  const sessionHint = useCookie<string | null>("auth-session-hint", {
    default: () => null,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 30,
  });

  // This privacy-safe random identifier is account-scoped by the backend.
  // Keep it when a device is blocked so refreshing the page cannot silently
  // create a new identity and bypass the Administrator's block.
  const deviceIdentifier = useCookie<string | null>("sncbt-device-id", {
    default: () => null,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 365,
  });

  const studentMonitoringSession = useCookie<string | null>(
    "sncbt-student-session",
    {
      default: () => null,
      sameSite: "lax",
      secure: import.meta.env.PROD,
    },
  );

  const sharedMonitoringSession = useCookie<string | null>(
    "sncbt-portal-monitoring-session",
    {
      default: () => null,
      sameSite: "lax",
      secure: import.meta.env.PROD,
    },
  );

  const deviceAccessMessage = useState<string>("device-access-message", () => "");
  const membershipAccessMessage = useState<string>(
    "student-membership-access-message",
    () => "",
  );

  const role = computed<ApplicationRole>(() => normalizeRole(user.value?.role));

  const isAuthenticated = computed(() =>
    Boolean(accessToken.value && user.value && role.value),
  );

  const isAdministrator = computed(() =>
    role.value === "administrator" ||
    role.value === "super-administrator",
  );

  const isSuperAdministrator = computed(() =>
    role.value === "super-administrator",
  );

  const isStudent = computed(() => role.value === "student");
  const isFaculty = computed(() => role.value === "faculty");
  const isLibrarian = computed(() => role.value === "librarian");

  const homeRoute = computed(() => {
    switch (role.value) {
      case "administrator":
      case "super-administrator":
        return "/admin/dashboard";

      case "librarian":
        return "/librarian/dashboard";

      case "student":
        return "/student/dashboard";

      case "faculty":
        return "/faculty/dashboard";

      default:
        return "/";
    }
  });

  function ensureDeviceIdentifier(): string {
    if (!deviceIdentifier.value) {
      deviceIdentifier.value = randomDeviceIdentifier();
    }

    return deviceIdentifier.value;
  }

  function clearSession() {
    accessToken.value = null;
    user.value = null;
    sessionHint.value = null;
    studentMonitoringSession.value = null;
    sharedMonitoringSession.value = null;

    // Clear in-memory monitoring state while preserving sncbt-device-id.
    useState("student-session-data", () => null).value = null;
    useState("portal-monitoring-session-data", () => null).value = null;
  }

  function createRequestHeaders(
    existingHeaders?: HeadersInit,
    token?: string | null,
  ): Headers {
    const headers = new Headers(existingHeaders);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (import.meta.client) {
      headers.set("X-Device-ID", ensureDeviceIdentifier());
    }

    return headers;
  }

  async function handleAccessRestriction(error: unknown): Promise<boolean> {
    if (getHttpStatus(error) !== DEVICE_BLOCKED_STATUS) return false;

    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    let accessQuery = "";

    if (code === "DEVICE_BLOCKED") {
      deviceAccessMessage.value = message;
      membershipAccessMessage.value = "";
      accessQuery = "device-blocked";
    } else if (code.startsWith("STUDENT_")) {
      membershipAccessMessage.value = message;
      deviceAccessMessage.value = "";
      accessQuery = "membership-required";
    } else {
      return false;
    }

    clearSession();
    initialized.value = true;

    // Hard navigation immediately removes protected Student Portal content.
    if (import.meta.client && window.location.pathname !== "/") {
      window.location.replace(`/?access=${accessQuery}`);
    }

    return true;
  }

  async function fetchCurrentUser(token: string): Promise<AuthUser> {
    const response = await $fetch<RawAuthUser>(`${strapiUrl}/api/users/me`, {
      method: "GET",
      query: {
        populate: "role",
      },
      credentials: "include",
      headers: createRequestHeaders(undefined, token),
    });

    const currentUser = normalizeUser(response);

    if (!currentUser.role) {
      throw createError({
        statusCode: 403,
        statusMessage:
          "This account is not ready for portal access. Please contact the system administrator.",
      });
    }

    return currentUser;
  }

  async function login(
    identifier: string,
    password: string,
  ): Promise<AuthUser> {
    let response: LoginResponse;

    try {
      response = await $fetch<LoginResponse>(
        `${strapiUrl}/api/auth/local`,
        {
          method: "POST",
          credentials: "include",
          headers: createRequestHeaders(),
          body: {
            identifier: identifier.trim(),
            password,
          },
        },
      );
    } catch (error) {
      await handleAccessRestriction(error);
      throw error;
    }

    accessToken.value = response.jwt;

    try {
      const currentUser = await fetchCurrentUser(response.jwt);

      user.value = currentUser;
      deviceAccessMessage.value = "";
      membershipAccessMessage.value = "";
      sessionHint.value = "1";
      initialized.value = true;

      return currentUser;
    } catch (error) {
      await handleAccessRestriction(error);
      clearSession();
      initialized.value = true;
      throw error;
    }
  }

  async function performRefresh(): Promise<boolean> {
    if (!sessionHint.value) {
      return false;
    }

    try {
      const response = await $fetch<RefreshResponse>(
        `${strapiUrl}/api/auth/refresh`,
        {
          method: "POST",
          credentials: "include",
          headers: createRequestHeaders(),
        },
      );

      accessToken.value = response.jwt;
      user.value = await fetchCurrentUser(response.jwt);
      deviceAccessMessage.value = "";
      membershipAccessMessage.value = "";

      return true;
    } catch (error) {
      await handleAccessRestriction(error);
      clearSession();
      return false;
    }
  }

  async function refreshSession(): Promise<boolean> {
    if (!activeRefreshRequest) {
      activeRefreshRequest = performRefresh().finally(() => {
        activeRefreshRequest = null;
      });
    }

    return await activeRefreshRequest;
  }

  async function initialize(): Promise<boolean> {
    if (initialized.value) {
      return isAuthenticated.value;
    }

    if (!sessionHint.value) {
      initialized.value = true;
      return false;
    }

    await refreshSession();

    initialized.value = true;

    return isAuthenticated.value;
  }

  async function authFetch<T>(
    path: string,
    options: AuthFetchOptions = {},
  ): Promise<T> {
    if (!accessToken.value) {
      const refreshed = await refreshSession();

      if (!refreshed || !accessToken.value) {
        throw createError({
          statusCode: 401,
          statusMessage: "Authentication required",
        });
      }
    }

    const requestUrl = `${strapiUrl}${
      path.startsWith("/") ? path : `/${path}`
    }`;

    const executeRequest = () =>
      $fetch<T>(requestUrl, {
        ...options,
        credentials: "include",
        headers: createRequestHeaders(
          options.headers,
          accessToken.value!,
        ),
      });

    const executeWithRefresh = async (): Promise<T> => {
      try {
        return await executeRequest();
      } catch (error) {
        if (await handleAccessRestriction(error)) {
          throw error;
        }

        if (getHttpStatus(error) !== 401) {
          throw error;
        }

        const refreshed = await refreshSession();

        if (!refreshed || !accessToken.value) {
          throw error;
        }

        try {
          return await executeRequest();
        } catch (retryError) {
          await handleAccessRestriction(retryError);
          throw retryError;
        }
      }
    };

    const method = String(options.method ?? "GET").toUpperCase();
    const maintenance = useSystemMaintenance();
    const maintenanceReadMethod = ["GET", "HEAD", "OPTIONS"].includes(method);
    const maintenanceInfrastructurePath =
      path === "/api/auth/local" ||
      path === "/api/auth/refresh" ||
      path === "/api/auth/logout" ||
      path.startsWith("/api/admin-") ||
      path.startsWith("/api/admin-management");

    if (
      maintenance.enabled.value &&
      !isAdministrator.value &&
      !maintenanceReadMethod &&
      !maintenanceInfrastructurePath
    ) {
      throw createError({
        statusCode: 503,
        statusMessage: maintenance.status.value.message,
        data: {
          error: {
            status: 503,
            name: "MaintenanceReadOnlyError",
            message: maintenance.status.value.message,
            details: { code: "SYSTEM_MAINTENANCE_READ_ONLY" },
          },
        },
      });
    }

    if (method !== "GET" || options.body) {
      try {
        return await executeWithRefresh();
      } catch (caught) {
        maintenance.applyReadOnlyError(caught);
        throw caught;
      }
    }

    // Coalesce only identical GETs that are currently in flight. This does not
    // cache completed responses, so later refreshes still reach Strapi.
    const dedupeKey = requestDedupeKey(requestUrl, options);
    const existing = activeGetRequests.get(dedupeKey);
    if (existing) {
      return await (existing as Promise<T>);
    }

    const pending = executeWithRefresh().finally(() => {
      if (activeGetRequests.get(dedupeKey) === pending) {
        activeGetRequests.delete(dedupeKey);
      }
    });
    activeGetRequests.set(dedupeKey, pending);

    return await pending;
  }

  async function logout(allDevices = false): Promise<void> {
    try {
      if (accessToken.value) {
        await $fetch(`${strapiUrl}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: createRequestHeaders(undefined, accessToken.value),
          ...(allDevices
            ? {
                body: {
                  scope: "all",
                },
              }
            : {}),
        });
      }
    } catch (error) {
      appLogger.warn(
        "The remote logout request failed. The local session was still cleared.",
        error,
      );
    } finally {
      clearSession();
      initialized.value = true;
    }
  }

  return {
    accessToken,
    user,
    role,
    initialized,
    isAuthenticated,
    isAdministrator,
    isSuperAdministrator,
    isStudent,
    isFaculty,
    isLibrarian,
    homeRoute,
    deviceIdentifier,
    deviceAccessMessage,
    membershipAccessMessage,
    ensureDeviceIdentifier,
    login,
    logout,
    initialize,
    refreshSession,
    fetchCurrentUser,
    authFetch,
    clearSession,
    getErrorMessage,
  };
}
