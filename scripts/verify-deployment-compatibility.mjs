import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const target = args.get("target") || "localhost";
if (!["localhost", "staging", "production"].includes(target)) {
  throw new Error(`Unsupported deployment compatibility target: ${target}`);
}

function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  const parsed = {};
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    parsed[key] = value;
  }
  return parsed;
}

const envName = target === "production" ? ".env.e2e.production" : target === "staging" ? ".env.e2e.staging" : ".env.e2e.local";
const envPath = resolve(process.cwd(), envName);
const fileEnv = parseEnvFile(envPath);
const env = { ...process.env, ...fileEnv };
const frontendUrl = String(args.get("frontend-url") || env.E2E_FRONTEND_URL || (target === "localhost" ? "http://localhost:3000" : "")).replace(/\/$/, "");
const backendUrl = String(args.get("backend-url") || env.E2E_BACKEND_URL || (target === "localhost" ? "http://localhost:1337" : "")).replace(/\/$/, "");
if (!frontendUrl || !backendUrl) {
  const templateName = target === "production"
    ? ".env.e2e.production.example"
    : target === "staging"
      ? ".env.e2e.staging.example"
      : ".env.e2e.example";
  throw new Error(
    `Configure E2E_FRONTEND_URL and E2E_BACKEND_URL in ${envName}. Start from ${templateName}; remote verification begins only after that deployment exists.`,
  );
}

const frontend = new URL(frontendUrl);
const backend = new URL(backendUrl);
if (target === "production") {
  if (frontend.protocol !== "https:" || backend.protocol !== "https:") {
    throw new Error("Production compatibility verification requires HTTPS frontend and backend URLs.");
  }
}

const failures = [];
const warnings = [];
const timeoutMs = Number.parseInt(env.E2E_TIMEOUT_MS || "30000", 10) || 30000;
const requiredFrontendHeaders = [
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "cross-origin-embedder-policy",
];
const backendSecurityHeaders = [
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-resource-policy",
  "cross-origin-embedder-policy",
];

async function fetchChecked(url, init, label) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    failures.push(`${label} could not be reached: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const frontResponse = await fetchChecked(`${frontendUrl}/`, { redirect: "manual" }, "Frontend");
if (frontResponse) {
  if (frontResponse.status >= 500) failures.push(`Frontend returned HTTP ${frontResponse.status}.`);
  for (const header of requiredFrontendHeaders) {
    if (!frontResponse.headers.get(header)) failures.push(`Frontend response is missing ${header}.`);
  }
  const csp = frontResponse.headers.get("content-security-policy") || "";
  if (target === "production" && /(?:^|\s)'unsafe-eval'(?:\s|$)/.test(csp)) failures.push("Production Content-Security-Policy must not include general 'unsafe-eval'.");
  if (target === "production" && !frontResponse.headers.get("strict-transport-security")) failures.push("Production frontend is missing Strict-Transport-Security.");
}

const publicEndpoint = `${backendUrl}/api/reference-data?scope=public-registration`;
const backendResponse = await fetchChecked(publicEndpoint, { headers: { Origin: frontend.origin }, redirect: "manual" }, "Backend public API");
if (backendResponse) {
  if (backendResponse.status >= 500) failures.push(`Backend public API returned HTTP ${backendResponse.status}.`);
  for (const header of backendSecurityHeaders) {
    if (!backendResponse.headers.get(header)) failures.push(`Backend public API is missing ${header}.`);
  }
  if (target === "production" && !backendResponse.headers.get("strict-transport-security")) failures.push("Production backend API is missing Strict-Transport-Security.");
  const allowOrigin = backendResponse.headers.get("access-control-allow-origin") || "";
  if (frontend.origin !== backend.origin && allowOrigin !== frontend.origin) failures.push(`Backend Access-Control-Allow-Origin must equal ${frontend.origin}; received ${allowOrigin || "<missing>"}.`);
  if (frontend.origin !== backend.origin && backendResponse.headers.get("access-control-allow-credentials") !== "true") failures.push("Cross-origin backend responses must include Access-Control-Allow-Credentials: true.");
}

const preflight = await fetchChecked(`${backendUrl}/api/auth/local`, {
  method: "OPTIONS",
  headers: {
    Origin: frontend.origin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type,x-device-id",
  },
  redirect: "manual",
}, "Authentication CORS preflight");

if (preflight) {
  if (preflight.status >= 400) failures.push(`Authentication OPTIONS preflight returned HTTP ${preflight.status}.`);
  const allowOrigin = preflight.headers.get("access-control-allow-origin") || "";
  const allowCredentials = preflight.headers.get("access-control-allow-credentials") || "";
  const allowMethods = (preflight.headers.get("access-control-allow-methods") || "").toUpperCase();
  const allowHeaders = (preflight.headers.get("access-control-allow-headers") || "").toLowerCase();
  if (frontend.origin !== backend.origin && allowOrigin !== frontend.origin) failures.push(`Authentication preflight Access-Control-Allow-Origin must equal ${frontend.origin}.`);
  if (frontend.origin !== backend.origin && allowCredentials !== "true") failures.push("Authentication preflight must allow credentials.");
  if (!allowMethods.split(/\s*,\s*/).includes("POST")) failures.push("Authentication preflight Access-Control-Allow-Methods must include POST.");
  for (const header of ["content-type", "x-device-id"]) {
    if (!allowHeaders.split(/\s*,\s*/).includes(header)) failures.push(`Authentication preflight Access-Control-Allow-Headers must include ${header === "x-device-id" ? "X-Device-ID" : header}.`);
  }
}

if (target !== "production" && (frontend.protocol !== "https:" || backend.protocol !== "https:")) {
  warnings.push("HTTP is acceptable for local/test environments only; production must use HTTPS.");
}

if (warnings.length) {
  console.warn("Deployment compatibility warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (failures.length) {
  console.error("Deployment compatibility verification FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Deployment compatibility verification PASSED for ${target}.`);
console.log(`Frontend: ${frontend.origin}`);
console.log(`Backend : ${backend.origin}`);
