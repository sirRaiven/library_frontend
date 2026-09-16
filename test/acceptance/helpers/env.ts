export type AcceptanceRole = "administrator" | "librarian" | "student" | "faculty";
export type AcceptanceBrowser = "chromium" | "firefox" | "webkit";

export interface AcceptanceCredentials {
  username: string;
  password: string;
}

export interface AcceptanceEnv {
  target: "localhost" | "staging";
  browser: AcceptanceBrowser;
  frontendUrl: string;
  backendUrl: string;
  allowWrites: boolean;
  allowRemoteWrites: boolean;
  strict: boolean;
  headless: boolean;
  timeoutMs: number;
  credentials: Record<AcceptanceRole, AcceptanceCredentials | null>;
  fixtures: {
    bookDocumentId: string;
    bookId: string;
    adminUserId: string;
    adminRoleId: string;
    studentBarcode: string;
    availableBookBarcode: string;
    reservationBookQuery: string;
  };
}

const truthy = new Set(["1", "true", "yes", "on"]);

export function envFlag(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return truthy.has(value.trim().toLowerCase());
}

function cleanUrl(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

function credentials(prefix: string): AcceptanceCredentials | null {
  const username = process.env[`E2E_${prefix}_USERNAME`]?.trim() ?? "";
  const password = process.env[`E2E_${prefix}_PASSWORD`] ?? "";
  return username && password ? { username, password } : null;
}

export function isLocalUrl(value: string): boolean {
  const hostname = new URL(value).hostname.toLowerCase();
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(hostname);
}

export function getAcceptanceEnv(): AcceptanceEnv {
  const target = process.env.E2E_TARGET === "staging" ? "staging" : "localhost";
  const browser = (["firefox", "webkit"] as const).includes(process.env.E2E_BROWSER as "firefox" | "webkit")
    ? (process.env.E2E_BROWSER as AcceptanceBrowser)
    : "chromium";

  return {
    target,
    browser,
    frontendUrl: cleanUrl(process.env.E2E_FRONTEND_URL, "http://localhost:3000"),
    backendUrl: cleanUrl(process.env.E2E_BACKEND_URL, "http://localhost:1337"),
    allowWrites: envFlag("E2E_ALLOW_WRITES"),
    allowRemoteWrites: envFlag("E2E_ALLOW_REMOTE_WRITES"),
    strict: envFlag("E2E_STRICT"),
    headless: !envFlag("E2E_HEADED"),
    timeoutMs: Number.parseInt(process.env.E2E_TIMEOUT_MS ?? "30000", 10) || 30_000,
    credentials: {
      administrator: credentials("ADMIN"),
      librarian: credentials("LIBRARIAN"),
      student: credentials("STUDENT"),
      faculty: credentials("FACULTY"),
    },
    fixtures: {
      bookDocumentId: process.env.E2E_BOOK_DOCUMENT_ID?.trim() ?? "",
      bookId: process.env.E2E_BOOK_ID?.trim() ?? "",
      adminUserId: process.env.E2E_ADMIN_USER_ID?.trim() ?? "",
      adminRoleId: process.env.E2E_ADMIN_ROLE_ID?.trim() ?? "",
      studentBarcode: process.env.E2E_STUDENT_BARCODE?.trim() ?? "",
      availableBookBarcode: process.env.E2E_AVAILABLE_BOOK_BARCODE?.trim() ?? "",
      reservationBookQuery: process.env.E2E_RESERVATION_BOOK_QUERY?.trim() ?? "",
    },
  };
}

export function requireRoleCredentials(env: AcceptanceEnv, role: AcceptanceRole): AcceptanceCredentials {
  const value = env.credentials[role];
  if (!value) {
    throw new Error(
      `Missing ${role} E2E credentials. Set E2E_${role === "administrator" ? "ADMIN" : role.toUpperCase()}_USERNAME and E2E_${role === "administrator" ? "ADMIN" : role.toUpperCase()}_PASSWORD.`,
    );
  }
  return value;
}

export function assertWriteSafety(env: AcceptanceEnv): void {
  if (!env.allowWrites) return;

  const localFrontend = isLocalUrl(env.frontendUrl);
  const localBackend = isLocalUrl(env.backendUrl);
  if (localFrontend && localBackend) return;

  if (!env.allowRemoteWrites) {
    throw new Error(
      "Remote E2E writes are blocked. Set E2E_ALLOW_REMOTE_WRITES=true only for a dedicated non-production staging environment.",
    );
  }

  if (process.env.E2E_REMOTE_WRITE_CONFIRMATION !== "I_UNDERSTAND_THIS_MUTATES_TEST_DATA") {
    throw new Error(
      "Remote E2E writes require E2E_REMOTE_WRITE_CONFIRMATION=I_UNDERSTAND_THIS_MUTATES_TEST_DATA.",
    );
  }
}

export function assertStrictFixtures(env: AcceptanceEnv): void {
  if (!env.strict) return;

  for (const role of ["administrator", "librarian", "student", "faculty"] as const) {
    requireRoleCredentials(env, role);
  }

  const missing = Object.entries(env.fixtures)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Strict acceptance requires fixture values: ${missing.join(", ")}`);
  }

  assertWriteSafety(env);
}
