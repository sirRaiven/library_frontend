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
}

let activeRefreshRequest: Promise<boolean> | null = null;

function getHttpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    statusCode?: number;
    status?: number;
    response?: {
      status?: number;
    };
  };

  return (
    fetchError.response?.status ?? fetchError.statusCode ?? fetchError.status
  );
}

function getErrorMessage(error: unknown): string {
  const fetchError = error as {
    statusMessage?: string;
    data?: {
      error?: {
        message?: string;
      };
      message?: string;
    };
    response?: {
      _data?: {
        error?: {
          message?: string;
        };
        message?: string;
      };
    };
    message?: string;
  };

  return (
    fetchError.data?.error?.message ??
    fetchError.data?.message ??
    fetchError.response?._data?.error?.message ??
    fetchError.response?._data?.message ??
    fetchError.statusMessage ??
    fetchError.message ??
    "An unexpected authentication error occurred."
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

  function clearSession() {
    accessToken.value = null;
    user.value = null;
    sessionHint.value = null;
  }

  function createAuthorizationHeaders(
    token: string,
    existingHeaders?: HeadersInit,
  ): Headers {
    const headers = new Headers(existingHeaders);

    headers.set("Authorization", `Bearer ${token}`);

    return headers;
  }

  async function fetchCurrentUser(token: string): Promise<AuthUser> {
    const response = await $fetch<RawAuthUser>(`${strapiUrl}/api/users/me`, {
      method: "GET",
      query: {
        populate: "role",
      },
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const currentUser = normalizeUser(response);

    if (!currentUser.role) {
      throw createError({
        statusCode: 403,
        statusMessage:
          "Strapi authenticated the account but did not return its application role. In Users & Permissions → Roles, open the assigned role and enable User → me plus Role → find and findOne, then confirm that the account is assigned to that role.",
      });
    }

    return currentUser;
  }

  async function login(
    identifier: string,
    password: string,
  ): Promise<AuthUser> {
    const response = await $fetch<LoginResponse>(
      `${strapiUrl}/api/auth/local`,
      {
        method: "POST",
        credentials: "include",
        body: {
          identifier: identifier.trim(),
          password,
        },
      },
    );

    accessToken.value = response.jwt;

    try {
      const currentUser = await fetchCurrentUser(response.jwt);

      user.value = currentUser;
      sessionHint.value = "1";
      initialized.value = true;

      return currentUser;
    } catch (error) {
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
        },
      );

      accessToken.value = response.jwt;
      user.value = await fetchCurrentUser(response.jwt);

      return true;
    } catch {
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
        headers: createAuthorizationHeaders(
          accessToken.value!,
          options.headers,
        ),
      });

    try {
      return await executeRequest();
    } catch (error) {
      if (getHttpStatus(error) !== 401) {
        throw error;
      }

      const refreshed = await refreshSession();

      if (!refreshed || !accessToken.value) {
        throw error;
      }

      return await executeRequest();
    }
  }

  async function logout(allDevices = false): Promise<void> {
    try {
      if (accessToken.value) {
        await $fetch(`${strapiUrl}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
          },
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
      console.warn(
        "The Strapi logout request failed. The local session was still cleared.",
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
    homeRoute,
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
