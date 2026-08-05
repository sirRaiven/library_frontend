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

function statusFallback(status: number | undefined, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to complete this action.";
  if (status === 404) return "The requested record could not be found.";
  if (status === 409) return "This action conflicts with an existing record. Refresh the page and try again.";
  if (status === 413) return "The selected file is too large.";
  if (status === 429) return "Too many requests were made. Please wait a moment and try again.";
  if (status && status >= 500) return "The Library System could not complete the request. Please try again.";
  return fallback;
}

export function userFacingErrorMessage(
  error: unknown,
  fallback = "The request could not be completed. Please try again.",
): string {
  const status = errorStatus(error);
  const message = rawErrorMessage(error).replace(/\s+/g, " ").slice(0, 300);

  if (!message || TECHNICAL_MESSAGE_PATTERN.test(message)) {
    return statusFallback(status, fallback);
  }

  if (status && status >= 500) {
    return statusFallback(status, fallback);
  }

  return message;
}
