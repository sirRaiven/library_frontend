import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROLE_SPECS = [
  { slot: "administrator", label: "Administrator", prefix: "ADMIN" },
  { slot: "librarian", label: "Librarian", prefix: "LIBRARIAN" },
  { slot: "student", label: "Student", prefix: "STUDENT" },
  { slot: "faculty", label: "Faculty", prefix: "FACULTY" },
];

export function parseEnvText(text) {
  const parsed = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

export function setEnvValues(text, values) {
  const remaining = new Map(Object.entries(values).map(([key, value]) => [key, String(value)]));
  const lines = text.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || !remaining.has(match[1])) return line;
    const key = match[1];
    const value = remaining.get(key);
    remaining.delete(key);
    return `${key}=${value}`;
  });

  while (lines.length && lines.at(-1) === "") lines.pop();
  if (remaining.size) {
    lines.push("");
    for (const [key, value] of remaining) lines.push(`${key}=${value}`);
  }
  return `${lines.join("\n")}\n`;
}

function normalizedRoleType(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function validateRoleType(slot, actualRoleType) {
  const actual = normalizedRoleType(actualRoleType);
  if (slot === "administrator") return actual === "administrator" || actual === "super-administrator";
  return actual === slot;
}

function extractRole(user) {
  const raw = user?.role?.data ?? user?.role ?? null;
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id ?? null,
    documentId: raw.documentId ?? null,
    name: raw.name ?? "",
    type: normalizedRoleType(raw.type ?? raw.name),
  };
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function authenticateRole(fetchImpl, backendUrl, spec, username, password) {
  const deviceId = `sncbt-e2e-${randomUUID()}`;
  const loginResponse = await fetchImpl(`${backendUrl}/api/auth/local`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "X-Device-ID": deviceId },
    body: JSON.stringify({ identifier: username, password }),
  });

  const loginBody = await responseJson(loginResponse);
  const jwt = loginBody?.jwt;
  if (!loginResponse.ok || !jwt) {
    throw new Error(`${spec.label} credentials were rejected by Strapi (HTTP ${loginResponse.status}).`);
  }

  const meResponse = await fetchImpl(`${backendUrl}/api/users/me?populate=role`, {
    headers: { Authorization: `Bearer ${jwt}`, accept: "application/json", "X-Device-ID": deviceId },
  });
  const user = await responseJson(meResponse);
  if (!meResponse.ok || !user?.id) {
    throw new Error(`${spec.label} account authenticated but /api/users/me could not be loaded (HTTP ${meResponse.status}).`);
  }

  const role = extractRole(user);
  if (!role?.type) {
    throw new Error(`${spec.label} account has no application role assigned.`);
  }
  if (!validateRoleType(spec.slot, role.type)) {
    throw new Error(`${spec.label} E2E slot resolved to role "${role.type}" instead of the expected ${spec.slot} role.`);
  }

  return { jwt, user, role, deviceId };
}

export async function discoverBookFixture(fetchImpl, backendUrl, authenticatedRoles) {
  const query = new URL(`${backendUrl}/api/books`);
  query.searchParams.set("pagination[page]", "1");
  query.searchParams.set("pagination[pageSize]", "25");
  query.searchParams.set("sort[0]", "createdAt:desc");

  for (const account of authenticatedRoles) {
    const response = await fetchImpl(query, {
      headers: {
        Authorization: `Bearer ${account.jwt}`,
        accept: "application/json",
        ...(account.deviceId ? { "X-Device-ID": account.deviceId } : {}),
      },
    });
    if (!response.ok) continue;
    const body = await responseJson(response);
    const rows = Array.isArray(body?.data) ? body.data : [];
    const entry = rows.find((record) => {
      const source = record?.attributes && typeof record.attributes === "object"
        ? { ...record.attributes, ...record }
        : record;
      return source?.documentId || source?.id;
    });
    if (!entry) continue;

    const source = entry?.attributes && typeof entry.attributes === "object"
      ? { ...entry.attributes, ...entry }
      : entry;
    const documentId = String(source.documentId ?? "").trim();
    if (!documentId) {
      throw new Error("The Books API returned a record without a Strapi v5 documentId; authenticated dynamic book routes cannot be configured safely.");
    }

    return {
      bookId: documentId,
      bookDocumentId: documentId,
      title: String(source.title ?? source.book_title ?? source.name ?? "Book fixture"),
      sourceRole: account.label,
    };
  }

  throw new Error("Unable to discover a readable published book fixture using the configured E2E role accounts.");
}

function missingCredentials(env) {
  const missing = [];
  for (const spec of ROLE_SPECS) {
    const usernameKey = `E2E_${spec.prefix}_USERNAME`;
    const passwordKey = `E2E_${spec.prefix}_PASSWORD`;
    if (!env[usernameKey]?.trim()) missing.push(usernameKey);
    if (!env[passwordKey]) missing.push(passwordKey);
  }
  return missing;
}

export async function runSetup({ cwd = process.cwd(), fetchImpl = fetch, target = "localhost" } = {}) {
  if (!['localhost', 'staging', 'production'].includes(target)) {
    throw new Error(`Unsupported setup target: ${target}.`);
  }

  const envName = target === "production" ? ".env.e2e.production" : target === "staging" ? ".env.e2e.staging" : ".env.e2e.local";
  const envPath = resolve(cwd, envName);
  const examplePath = resolve(cwd, target === "production" ? ".env.e2e.production.example" : target === "staging" ? ".env.e2e.staging.example" : ".env.e2e.example");

  if (!existsSync(envPath)) {
    if (!existsSync(examplePath)) throw new Error(".env.e2e.example is missing.");
    copyFileSync(examplePath, envPath);
    throw new Error(`${envName} was created from .env.e2e.example. Fill the four E2E role usernames/passwords, then rerun npm run setup:acceptance:authenticated.`);
  }

  const originalText = readFileSync(envPath, "utf8");
  const env = parseEnvText(originalText);
  const backendUrl = (env.E2E_BACKEND_URL?.trim() || "http://localhost:1337").replace(/\/+$/, "");

  if (target === "production" && new URL(backendUrl).protocol !== "https:") {
    throw new Error(`Production authenticated setup requires HTTPS backend URL: ${backendUrl}`);
  }

  if (target === "localhost") {
    const hostname = new URL(backendUrl).hostname.toLowerCase();
    if (!["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(hostname)) {
      throw new Error(`Local authenticated setup refuses a non-local backend URL: ${backendUrl}`);
    }
  }

  const missing = missingCredentials(env);
  if (missing.length) {
    throw new Error(`Authenticated setup needs the four role accounts first. Missing: ${missing.join(", ")}`);
  }

  console.log("\n=== SNCBT Library Authenticated Acceptance Setup ===");
  console.log(`Target  : ${target === "localhost" ? "Localhost" : target === "staging" ? "Staging" : "Production"}`);
  console.log(`Backend : ${backendUrl}`);
  console.log("Mode    : Credential validation + read-only fixture discovery");
  console.log("Writes  : DISABLED");

  const authenticated = {};
  for (const spec of ROLE_SPECS) {
    const username = env[`E2E_${spec.prefix}_USERNAME`];
    const password = env[`E2E_${spec.prefix}_PASSWORD`];
    const result = await authenticateRole(fetchImpl, backendUrl, spec, username, password);
    authenticated[spec.slot] = result;
    console.log(`[PASS] ${spec.label.padEnd(13)} account verified (${result.role.type})`);
  }

  const admin = authenticated.administrator;
  if (!admin?.user?.id || !admin?.role?.id) {
    throw new Error("Administrator account did not expose a user ID and role ID for dynamic route fixtures.");
  }

  const book = await discoverBookFixture(fetchImpl, backendUrl, [
    { label: "librarian", jwt: authenticated.librarian.jwt, deviceId: authenticated.librarian.deviceId },
    { label: "student", jwt: authenticated.student.jwt, deviceId: authenticated.student.deviceId },
    { label: "faculty", jwt: authenticated.faculty.jwt, deviceId: authenticated.faculty.deviceId },
    { label: "administrator", jwt: authenticated.administrator.jwt, deviceId: authenticated.administrator.deviceId },
  ]);

  const updates = {
    E2E_BOOK_DOCUMENT_ID: book.bookDocumentId,
    E2E_BOOK_ID: book.bookId,
    E2E_ADMIN_USER_ID: String(admin.user.id),
    E2E_ADMIN_ROLE_ID: String(admin.role.id),
    E2E_ALLOW_WRITES: "false",
  };

  writeFileSync(envPath, setEnvValues(originalText, updates), "utf8");

  console.log(`[PASS] Book fixture discovered via ${book.sourceRole}: ${book.title}`);
  console.log(`[PASS] Dynamic-route fixtures written to ${envName}`);
  console.log("[PASS] E2E_ALLOW_WRITES=false enforced");
  console.log("\nNext command:");
  console.log(target === "production" ? "  npm run test:acceptance:production" : target === "staging" ? "  npm run test:acceptance:staging" : "  npm run test:acceptance:authenticated");

  return { envPath, updates, book, roles: authenticated };
}

async function main() {
  const targetArg = process.argv.find((argument) => argument.startsWith("--target="));
  const target = targetArg ? targetArg.slice("--target=".length) : "localhost";
  await runSetup({ target });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`\n[FAIL] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
