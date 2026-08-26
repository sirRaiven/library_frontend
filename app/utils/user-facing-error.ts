interface FetchErrorShape {
  status?: number;
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  data?: {
    message?: string;
    error?: {
      message?: string;
      details?: { code?: string };
    };
  };
  response?: {
    status?: number;
    _data?: {
      message?: string;
      error?: {
        message?: string;
        details?: { code?: string };
      };
    };
  };
}

const TECHNICAL_MESSAGE_PATTERN = new RegExp(
  [
    "strapi",
    "postgres",
    "postgresql",
    "database",
    "sql\\b",
    "knex",
    "relation",
    "constraint",
    "duplicate key",
    "document service",
    "content-type",
    "content type",
    "invalid key",
    "invalid populate",
    "populate path",
    "users & permissions",
    "api::",
    "plugin::",
    "global::",
    "node_modules",
    "stack trace",
    "syntaxerror",
    "typeerror",
    "referenceerror",
    "undefined",
    "cannot read properties",
    "failed to fetch",
    "fetch failed",
    "networkerror",
    "econn",
    "enotfound",
    "timeout",
    "internal server error",
    "status code",
    "http 5",
    "\\bselect\\b.+\\bfrom\\b",
    "\\binsert\\b.+\\binto\\b",
    "\\bupdate\\b.+\\bset\\b",
  ].join("|"),
  "i",
);

const NETWORK_MESSAGE_PATTERN =
  /failed to fetch|fetch failed|networkerror|econn|enotfound|network request failed|load failed/i;

const INVALID_CREDENTIAL_PATTERN =
  /invalid (?:identifier|username|email|password|credentials)|identifier or password|username or password|email or password|incorrect credentials/i;

const BLOCKED_ACCOUNT_PATTERN =
  /account.+blocked|blocked.+account|user.+blocked/i;

function errorShape(error: unknown): FetchErrorShape {
  return (error && typeof error === "object" ? error : {}) as FetchErrorShape;
}

export function errorStatus(error: unknown): number | undefined {
  const candidate = errorShape(error);
  return candidate.response?.status ?? candidate.statusCode ?? candidate.status;
}

export function errorCode(error: unknown): string {
  const candidate = errorShape(error);
  return String(
    candidate.data?.error?.details?.code ??
      candidate.response?._data?.error?.details?.code ??
      "",
  ).trim();
}

function rawErrorMessage(error: unknown): string {
  const candidate = errorShape(error);

  return String(
    candidate.data?.error?.message ??
      candidate.data?.message ??
      candidate.response?._data?.error?.message ??
      candidate.response?._data?.message ??
      candidate.statusMessage ??
      candidate.message ??
      "",
  ).trim();
}

function normalizedMessage(error: unknown): string {
  return rawErrorMessage(error).replace(/\s+/g, " ").slice(0, 300);
}

function statusFallback(status: number | undefined, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to complete this action.";
  if (status === 404) return "The requested information could not be found.";
  if (status === 409) return "This action conflicts with an existing record. Refresh the page and try again.";
  if (status === 413) return "The selected file is too large.";
  if (status === 429) return "Too many requests were made. Please wait a moment and try again.";
  if (status && status >= 500) return "Something went wrong while processing the request. Please try again.";
  return fallback;
}

export function userFacingErrorMessage(
  error: unknown,
  fallback = "The request could not be completed. Please try again.",
): string {
  const status = errorStatus(error);
  const code = errorCode(error);
  const message = normalizedMessage(error);

  if (code === "SYSTEM_MAINTENANCE_READ_ONLY") {
    return "This action is unavailable while the system is under maintenance.";
  }

  if (code === "DUPLICATE_OR_NUMBER") {
    return "This Official Receipt number has already been used. Enter a different receipt number.";
  }

  if (NETWORK_MESSAGE_PATTERN.test(message)) {
    return "We could not connect to the Library System. Check your connection and try again.";
  }

  if (!message || TECHNICAL_MESSAGE_PATTERN.test(message)) {
    return statusFallback(status, fallback);
  }

  if (status && status >= 500) {
    return statusFallback(status, fallback);
  }

  return message;
}

export function signInErrorMessage(error: unknown): string {
  const status = errorStatus(error);
  const message = normalizedMessage(error);

  if (NETWORK_MESSAGE_PATTERN.test(message)) {
    return "We could not connect to the Library System. Check your connection and try again.";
  }

  if (
    BLOCKED_ACCOUNT_PATTERN.test(message)
  ) {
    return "This account is currently unavailable. Please contact the Library Administrator.";
  }

  if (
    status === 400 ||
    status === 401 ||
    INVALID_CREDENTIAL_PATTERN.test(message)
  ) {
    return "The username/email or password is incorrect.";
  }

  if (status === 429) {
    return "Too many sign-in attempts. Please wait a moment before trying again.";
  }

  return userFacingErrorMessage(
    error,
    "We could not sign you in. Please try again.",
  );
}

export function registrationErrorMessage(error: unknown): string {
  const status = errorStatus(error);
  const message = normalizedMessage(error);

  if (NETWORK_MESSAGE_PATTERN.test(message)) {
    return "We could not connect to the Library System. Check your connection and try again.";
  }

  if (status === 409) {
    if (/student|email|username|account|already|exist/i.test(message)) {
      return "A registration or account already exists for some of the information you entered. Please review your details or visit the Library for assistance.";
    }
  }

  return userFacingErrorMessage(
    error,
    "We could not submit your request. Please review the information and try again.",
  );
}
