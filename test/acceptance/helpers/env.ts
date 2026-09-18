export type AcceptanceRole = "administrator" | "librarian" | "student" | "faculty";
export type AcceptanceBrowser = "chromium" | "firefox" | "webkit";

export interface AcceptanceCredentials {
  username: string;
  password: string;
}

export interface AcceptanceEnv {
  target: "localhost" | "staging" | "production";
  browser: AcceptanceBrowser;
  frontendUrl: string;
  backendUrl: string;
  allowWrites: boolean;
  allowRemoteWrites: boolean;
  strict: boolean;
  headless: boolean;
  webkitChannel: "" | "webkit-wsl";
  browserWsEndpoint: string;
  browserExposeNetwork: string;
  browserRemoteLabel: string;
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
  const target = process.env.E2E_TARGET === "production"
    ? "production"
    : process.env.E2E_TARGET === "staging"
      ? "staging"
      : "localhost";
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
    webkitChannel: process.env.E2E_WEBKIT_CHANNEL === "webkit-wsl" ? "webkit-wsl" : "",
    browserWsEndpoint: process.env.E2E_BROWSER_WS_ENDPOINT?.trim() ?? "",
    browserExposeNetwork: process.env.E2E_BROWSER_EXPOSE_NETWORK?.trim() || "<loopback>",
    browserRemoteLabel: process.env.E2E_BROWSER_REMOTE_LABEL?.trim() ?? "",
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

export function assertTransactionalFixtures(env: AcceptanceEnv): void {
  requireRoleCredentials(env, "student");
  requireRoleCredentials(env, "librarian");

  const required = {
    E2E_STUDENT_BARCODE: env.fixtures.studentBarcode,
    E2E_AVAILABLE_BOOK_BARCODE: env.fixtures.availableBookBarcode,
    E2E_RESERVATION_BOOK_QUERY: env.fixtures.reservationBookQuery,
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Write acceptance requires dedicated transactional fixture values: ${missing.join(", ")}`);
  }

  if (env.fixtures.studentBarcode === env.fixtures.availableBookBarcode) {
    throw new Error("E2E_STUDENT_BARCODE and E2E_AVAILABLE_BOOK_BARCODE must identify different records.");
  }
}

export function assertWriteSafety(env: AcceptanceEnv): void {
  if (!env.allowWrites) return;

  assertTransactionalFixtures(env);

  const localFrontend = isLocalUrl(env.frontendUrl);
  const localBackend = isLocalUrl(env.backendUrl);
  if (localFrontend && localBackend) {
    if (process.env.E2E_LOCAL_WRITE_CONFIRMATION !== "I_UNDERSTAND_THIS_MUTATES_LOCAL_TEST_DATA") {
      throw new Error(
        "Local E2E writes require E2E_LOCAL_WRITE_CONFIRMATION=I_UNDERSTAND_THIS_MUTATES_LOCAL_TEST_DATA.",
      );
    }
    return;
  }

  throw new Error(
    "Remote E2E writes are disabled by design. Use the localhost write command with dedicated local test fixtures.",
  );
}

export function assertStrictFixtures(env: AcceptanceEnv): void {
  if (!env.strict) return;

  for (const role of ["administrator", "librarian", "student", "faculty"] as const) {
    requireRoleCredentials(env, role);
  }

  const dynamicFixtureValues = {
    bookDocumentId: env.fixtures.bookDocumentId,
    bookId: env.fixtures.bookId,
    adminUserId: env.fixtures.adminUserId,
    adminRoleId: env.fixtures.adminRoleId,
  };
  const missing = Object.entries(dynamicFixtureValues)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Strict acceptance requires read-only dynamic fixture values: ${missing.join(", ")}`);
  }

  if (env.allowWrites) assertTransactionalFixtures(env);
  assertWriteSafety(env);
}
