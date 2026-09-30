import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...rest] = argument.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const requestedTarget = args.get("target") || "localhost";
if (!["localhost", "staging", "production"].includes(requestedTarget)) {
  throw new Error(`Unsupported acceptance target: ${requestedTarget}.`);
}
const target = requestedTarget;
const requestedBrowser = args.get("browser") || "chromium";
const scope = args.get("scope") || "readonly";
const requestedWebkitChannel = args.get("webkit-channel") || "";
const requestedBrowserEndpoint = args.get("browser-endpoint") || "";
const requestedBrowserExposeNetwork = args.get("browser-expose-network") || "<loopback>";
const requestedBrowserRemoteLabel = args.get("browser-remote-label") || "";

if (!["readonly", "authenticated-readonly", "write", "release"].includes(scope)) {
  throw new Error(`Unsupported acceptance scope: ${scope}`);
}
if (!["chromium", "firefox", "webkit", "all"].includes(requestedBrowser)) {
  throw new Error(`Unsupported acceptance browser: ${requestedBrowser}`);
}
if (requestedWebkitChannel && requestedWebkitChannel !== "webkit-wsl") {
  throw new Error(`Unsupported WebKit channel: ${requestedWebkitChannel}.`);
}
if (requestedBrowserEndpoint && requestedWebkitChannel) {
  throw new Error("Use either a WebKit channel or a remote browser endpoint, not both.");
}

function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  const parsed = {};
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
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

const coverageVerifier = resolve(process.cwd(), "scripts/verify-acceptance-test-coverage.mjs");
if (!existsSync(coverageVerifier)) {
  throw new Error("Acceptance coverage verifier is missing.");
}
await new Promise((resolvePromise, rejectPromise) => {
  const child = spawn(process.execPath, [coverageVerifier], { cwd: process.cwd(), stdio: "inherit" });
  child.on("error", rejectPromise);
  child.on("exit", (code) => code === 0 ? resolvePromise() : rejectPromise(new Error(`Acceptance coverage verification failed with exit code ${code ?? "unknown"}.`)));
});

const envFile = resolve(
  process.cwd(),
  target === "production"
    ? ".env.e2e.production"
    : target === "staging"
      ? ".env.e2e.staging"
      : ".env.e2e.local",
);
const fileEnv = parseEnvFile(envFile);
const projectEnv = parseEnvFile(resolve(process.cwd(), ".env"));
const childBaseEnv = { ...process.env, ...fileEnv, E2E_TARGET: target };
if (args.get("frontend-url")) childBaseEnv.E2E_FRONTEND_URL = args.get("frontend-url");
if (args.get("backend-url")) childBaseEnv.E2E_BACKEND_URL = args.get("backend-url");
if (requestedWebkitChannel) childBaseEnv.E2E_WEBKIT_CHANNEL = requestedWebkitChannel;
if (requestedBrowserEndpoint) childBaseEnv.E2E_BROWSER_WS_ENDPOINT = requestedBrowserEndpoint;
if (requestedBrowserExposeNetwork) childBaseEnv.E2E_BROWSER_EXPOSE_NETWORK = requestedBrowserExposeNetwork;
if (requestedBrowserRemoteLabel) childBaseEnv.E2E_BROWSER_REMOTE_LABEL = requestedBrowserRemoteLabel;

if (target === "localhost") {
  childBaseEnv.E2E_FRONTEND_URL ||= "http://localhost:3000";
  childBaseEnv.E2E_BACKEND_URL ||= "http://localhost:1337";
}

if (!childBaseEnv.E2E_FRONTEND_URL || !childBaseEnv.E2E_BACKEND_URL) {
  const template = target === "production"
    ? ".env.e2e.production.example"
    : target === "staging"
      ? ".env.e2e.staging.example"
      : ".env.e2e.example";
  throw new Error([
    `Missing E2E_FRONTEND_URL or E2E_BACKEND_URL. Configure ${envFile}.`,
    `Start from ${template}; staging/production checks are not expected to run before those deployment URLs exist.`,
  ].join("\n"));
}

const frontend = new URL(childBaseEnv.E2E_FRONTEND_URL);
const backend = new URL(childBaseEnv.E2E_BACKEND_URL);
const localhostHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);
const remote = !localhostHosts.has(frontend.hostname) || !localhostHosts.has(backend.hostname);

// Production data must never be used for acceptance writes. The only write
// scope is localhost with explicitly confirmed disposable Student/Book fixtures.
if (scope === "write" && target !== "localhost") {
  throw new Error("Write acceptance is restricted to localhost. Staging and production acceptance are read-only by design.");
}
if (target === "production" && (frontend.protocol !== "https:" || backend.protocol !== "https:")) {
  throw new Error("Production acceptance requires HTTPS frontend and backend URLs.");
}

if (scope === "readonly" || scope === "authenticated-readonly") {
  childBaseEnv.E2E_ALLOW_WRITES = "false";
  childBaseEnv.E2E_STRICT = "false";
} else if (scope === "write") {
  childBaseEnv.E2E_ALLOW_WRITES = "true";
  childBaseEnv.E2E_STRICT = "false";
} else {
  // Release/staging/production acceptance is intentionally read-only.
  childBaseEnv.E2E_ALLOW_WRITES = "false";
  childBaseEnv.E2E_ALLOW_REMOTE_WRITES = "false";
  childBaseEnv.E2E_STRICT = "true";
}

const authenticatedReadOnlyRequiredEnv = [
  "E2E_ADMIN_USERNAME", "E2E_ADMIN_PASSWORD",
  "E2E_LIBRARIAN_USERNAME", "E2E_LIBRARIAN_PASSWORD",
  "E2E_STUDENT_USERNAME", "E2E_STUDENT_PASSWORD",
  "E2E_FACULTY_USERNAME", "E2E_FACULTY_PASSWORD",
  "E2E_BOOK_DOCUMENT_ID", "E2E_BOOK_ID",
  "E2E_ADMIN_USER_ID", "E2E_ADMIN_ROLE_ID",
];

function missingEnv(names) {
  return names.filter((name) => !childBaseEnv[name]?.trim());
}

const writeRequiredEnv = [
  "E2E_STUDENT_USERNAME", "E2E_STUDENT_PASSWORD",
  "E2E_LIBRARIAN_USERNAME", "E2E_LIBRARIAN_PASSWORD",
  "E2E_STUDENT_BARCODE", "E2E_AVAILABLE_BOOK_BARCODE",
  "E2E_RESERVATION_BOOK_QUERY",
];

if (scope === "write") {
  const missing = missingEnv(writeRequiredEnv);
  if (missing.length) {
    throw new Error([
      "Local write acceptance is not configured completely.",
      `Missing environment values: ${missing.join(", ")}`,
      "",
      `Configure ${envFile} with dedicated test Student/Book fixtures before running write acceptance.`,
    ].join("\n"));
  }
  if (!remote && childBaseEnv.E2E_LOCAL_WRITE_CONFIRMATION !== "I_UNDERSTAND_THIS_MUTATES_LOCAL_TEST_DATA") {
    throw new Error(
      "Local write acceptance requires E2E_LOCAL_WRITE_CONFIRMATION=I_UNDERSTAND_THIS_MUTATES_LOCAL_TEST_DATA.",
    );
  }
}

if (scope === "authenticated-readonly") {
  const missing = missingEnv(authenticatedReadOnlyRequiredEnv);
  if (missing.length) {
    throw new Error([
      "Authenticated read-only acceptance is not configured completely.",
      `Missing environment values: ${missing.join(", ")}`,
      "",
      `Configure ${envFile} with four dedicated role accounts and the four dynamic-route fixture IDs.`,
      "This gate keeps E2E_ALLOW_WRITES=false; it does not run reservation or circulation mutations.",
    ].join("\n"));
  }
}

if (scope === "release") {
  const missing = missingEnv(authenticatedReadOnlyRequiredEnv);
  if (missing.length) {
    throw new Error([
      "Strict release acceptance is not configured completely.",
      `Missing environment values: ${missing.join(", ")}`,
      "",
      `Configure ${envFile} with four dedicated role accounts and the four read-only dynamic-route fixture IDs.`,
      "Release acceptance is read-only; transaction barcodes and remote write flags are intentionally not used.",
    ].join("\n"));
  }
}

async function preflight(url, name) {
  let response;
  try {
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new Error(`${name} is not reachable at ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (response.status >= 500) {
    throw new Error(`${name} preflight returned HTTP ${response.status} at ${url}`);
  }
  console.log(`[PASS] ${name} reachable (${response.status})`);
}

async function preflightBrowserCors(apiOrigin, browserOrigin) {
  const url = `${apiOrigin.replace(/\/$/, "")}/api/system-status/maintenance?timestamp=${Date.now()}`;
  let response;
  try {
    response = await fetch(url, {
      redirect: "manual",
      headers: { Origin: browserOrigin },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new Error(`Browser CORS preflight could not reach ${apiOrigin}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const allowedOrigin = response.headers.get("access-control-allow-origin");
  if (allowedOrigin !== browserOrigin) {
    throw new Error([
      `Local acceptance would fail CORS before authentication.`,
      `Browser origin: ${browserOrigin}`,
      `Nuxt API origin: ${apiOrigin}`,
      `Backend Access-Control-Allow-Origin: ${allowedOrigin || "<missing>"}`,
      "",
      "Allow both local browser origins in the Strapi backend .env, for example:",
      "  FRONTEND_URLS=http://192.168.254.103:3000,http://localhost:3000",
      "Then restart Strapi before rerunning acceptance tests.",
    ].join("\n"));
  }

  console.log(`[PASS] Browser CORS allows ${browserOrigin} -> ${apiOrigin}`);
}

const browsers = requestedBrowser === "all" ? ["chromium", "firefox", "webkit"] : [requestedBrowser];
function usesRemoteBrowser(browser) {
  return browser === "webkit" && Boolean(childBaseEnv.E2E_BROWSER_WS_ENDPOINT);
}
function remoteBrowserLabel() {
  return childBaseEnv.E2E_BROWSER_REMOTE_LABEL?.trim() || "Remote";
}
const browserDisplay = browsers.map((browser) =>
  browser === "webkit" && childBaseEnv.E2E_WEBKIT_CHANNEL === "webkit-wsl"
    ? "Webkit (WSL)"
    : usesRemoteBrowser(browser)
      ? `Webkit (${remoteBrowserLabel()})`
      : browser[0].toUpperCase() + browser.slice(1),
).join(", ");
const scopeDisplay = scope === "readonly"
  ? "Read-only (public/optional authenticated)"
  : scope === "authenticated-readonly"
    ? "Authenticated read-only"
    : scope === "write"
      ? "Write-enabled"
      : "Strict release (read-only)";

console.log("\n=== SNCBT Library E2E Acceptance Tests ===");
console.log(`Target  : ${target === "localhost" ? "Localhost" : target === "staging" ? "Staging" : "Production"}`);
console.log(`Mode    : ${scopeDisplay}`);
console.log(`Browser : ${browserDisplay}`);
console.log("Runner  : Vitest + Playwright Core");

const roleConfig = [
  ["Administrator", "E2E_ADMIN_USERNAME", "E2E_ADMIN_PASSWORD"],
  ["Librarian", "E2E_LIBRARIAN_USERNAME", "E2E_LIBRARIAN_PASSWORD"],
  ["Student", "E2E_STUDENT_USERNAME", "E2E_STUDENT_PASSWORD"],
  ["Faculty", "E2E_FACULTY_USERNAME", "E2E_FACULTY_PASSWORD"],
];
const routeFixtureConfig = [
  ["Book document ID", "E2E_BOOK_DOCUMENT_ID"],
  ["Librarian book ID", "E2E_BOOK_ID"],
  ["Admin user ID", "E2E_ADMIN_USER_ID"],
  ["Admin role ID", "E2E_ADMIN_ROLE_ID"],
];
const writeFixtureConfig = [
  ["Student barcode", "E2E_STUDENT_BARCODE"],
  ["Available book barcode", "E2E_AVAILABLE_BOOK_BARCODE"],
  ["Reservation book query", "E2E_RESERVATION_BOOK_QUERY"],
];

console.log("Authentication configuration:");
for (const [label, usernameKey, passwordKey] of roleConfig) {
  const ready = Boolean(childBaseEnv[usernameKey]?.trim() && childBaseEnv[passwordKey]);
  console.log(`  ${label.padEnd(13)}: ${ready ? "READY" : "NOT CONFIGURED"}`);
}
console.log("Dynamic-route fixtures:");
for (const [label, key] of routeFixtureConfig) {
  console.log(`  ${label.padEnd(18)}: ${childBaseEnv[key]?.trim() ? "READY" : "NOT CONFIGURED"}`);
}
if (scope === "write") {
  console.log("Transactional fixtures:");
  for (const [label, key] of writeFixtureConfig) {
    console.log(`  ${label.padEnd(24)}: ${childBaseEnv[key]?.trim() ? "READY" : "NOT CONFIGURED"}`);
  }
}
if (scope === "readonly") {
  console.log("  Note: missing role accounts/fixtures are allowed in this smoke mode; related suites/routes may be skipped.");
} else if (scope === "authenticated-readonly") {
  console.log("[PASS] Authenticated read-only configuration complete (writes remain disabled)");
} else if (scope === "release") {
  console.log("[PASS] Strict release configuration complete (remote writes are disabled)");
}

await preflight(`${childBaseEnv.E2E_FRONTEND_URL.replace(/\/$/, "")}/`, "Nuxt frontend");
await preflight(`${childBaseEnv.E2E_BACKEND_URL.replace(/\/$/, "")}/api/reference-data?scope=public-registration`, "Strapi backend");

if (target === "localhost") {
  const configuredAppBackend = String(
    process.env.NUXT_PUBLIC_STRAPI_URL ?? projectEnv.NUXT_PUBLIC_STRAPI_URL ?? childBaseEnv.E2E_BACKEND_URL,
  ).trim().replace(/\/+$/, "");

  if (configuredAppBackend) {
    let apiOrigin;
    try {
      apiOrigin = new URL(configuredAppBackend).origin;
    } catch {
      throw new Error(`NUXT_PUBLIC_STRAPI_URL is not a valid absolute origin: ${configuredAppBackend}`);
    }
    await preflightBrowserCors(apiOrigin, frontend.origin);
  }
}

let playwright;
try {
  playwright = await import("playwright-core");
} catch (error) {
  throw new Error(`Playwright Core is not installed in this project. Run npm ci first.\n${error instanceof Error ? error.message : String(error)}`);
}

const launchers = {
  chromium: playwright.chromium,
  firefox: playwright.firefox,
  webkit: playwright.webkit,
};

function browserDisplayName(browser) {
  if (browser === "webkit" && childBaseEnv.E2E_WEBKIT_CHANNEL === "webkit-wsl") return "Webkit (WSL)";
  if (usesRemoteBrowser(browser)) return `Webkit (${remoteBrowserLabel()})`;
  return browser[0].toUpperCase() + browser.slice(1);
}

function browserLaunchOptions(browser) {
  if (browser === "webkit" && childBaseEnv.E2E_WEBKIT_CHANNEL === "webkit-wsl") {
    return { headless: true, channel: "webkit-wsl" };
  }
  return { headless: true };
}

function webkitLaunchDiagnostic(error) {
  const message = error instanceof Error ? error.message : String(error);
  const integrityBlocked = /3236495362|0xC0E90002|STATUS_SYSTEM_INTEGRITY_POLICY_VIOLATION/i.test(message);

  if (process.platform === "win32" && integrityBlocked) {
    return [
      "Playwright WebKit could not launch because Windows Code Integrity blocked the browser runtime (0xC0E90002).",
      "This is an operating-system/browser-runtime block, not an SNCBT application failure.",
      "Do not disable Smart App Control or WDAC just to make the acceptance suite pass.",
      "Check Event Viewer > Applications and Services Logs > Microsoft > Windows > CodeIntegrity > Operational for the blocked file (commonly Event 3077).",
      "",
      "Security-preserving alternatives are available without changing Windows security:",
      "  npm run phase35:webkit:docker",
      "or, if WSL browser bridging works on this machine:",
      "  npm run test:browsers:install:webkit-wsl",
      "  npm run phase35:webkit:wsl",
      "",
      `Original launch error: ${message}`,
    ].join("\n");
  }

  if (childBaseEnv.E2E_WEBKIT_CHANNEL === "webkit-wsl") {
    const bridgeFailure = /ECONNREFUSED|WebSocket error/i.test(message);
    return [
      "Playwright WebKit through WSL could not launch.",
      bridgeFailure
        ? "The WSL browser runtime started, but the Windows-to-WSL Playwright control WebSocket could not connect."
        : "Verify that the project-matching WSL WebKit runtime is installed.",
      bridgeFailure
        ? "Use the Docker WebKit fallback instead of weakening Windows/WSL security or networking:"
        : "Install the WSL runtime with:",
      bridgeFailure
        ? "  npm run phase35:webkit:docker"
        : "  npm run test:browsers:install:webkit-wsl",
      bridgeFailure ? "" : "Then rerun npm run phase35:webkit:wsl.",
      "",
      `Original launch error: ${message}`,
    ].filter(Boolean).join("\n");
  }

  return message;
}

async function probeBrowserLaunch(browser) {
  const remoteEndpoint = usesRemoteBrowser(browser) ? childBaseEnv.E2E_BROWSER_WS_ENDPOINT : "";
  const executable = launchers[browser].executablePath();
  const usingWebkitWsl = browser === "webkit" && childBaseEnv.E2E_WEBKIT_CHANNEL === "webkit-wsl";
  if (!remoteEndpoint && !usingWebkitWsl && (!executable || !existsSync(executable))) {
    throw new Error([
      `Playwright ${browser} runtime is not installed for this project's playwright-core version.`,
      executable ? `Expected executable: ${executable}` : "Expected executable path could not be resolved.",
      "",
      "Install the project-matching browser runtimes with:",
      "  npm run test:browsers:install",
    ].join("\n"));
  }

  let probe;
  try {
    probe = remoteEndpoint
      ? await launchers[browser].connect(remoteEndpoint, {
          exposeNetwork: childBaseEnv.E2E_BROWSER_EXPOSE_NETWORK || "<loopback>",
          timeout: 30_000,
        })
      : await launchers[browser].launch(browserLaunchOptions(browser));
  } catch (error) {
    const message = browser === "webkit" ? webkitLaunchDiagnostic(error) : (error instanceof Error ? error.message : String(error));
    throw new Error(`${browserDisplayName(browser)} launch preflight failed:\n${message}`);
  } finally {
    await probe?.close().catch(() => undefined);
  }

  console.log(`[PASS] ${browserDisplayName(browser)} runtime launch preflight`);
}

const vitestEntry = resolve(process.cwd(), "node_modules/vitest/vitest.mjs");
if (!existsSync(vitestEntry)) {
  throw new Error("Vitest is not installed. Run npm ci before the acceptance suite.");
}

const browserFailures = [];
for (const browser of browsers) {
  console.log(`\n--- Running ${browserDisplayName(browser)} acceptance project ---`);
  const childEnv = { ...childBaseEnv, E2E_BROWSER: browser };
  if (browser !== "webkit") {
    delete childEnv.E2E_BROWSER_WS_ENDPOINT;
    delete childEnv.E2E_BROWSER_EXPOSE_NETWORK;
    delete childEnv.E2E_BROWSER_REMOTE_LABEL;
  }
  try {
    await probeBrowserLaunch(browser);
    await new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(process.execPath, [vitestEntry, "--run", "--project", "acceptance"], {
        cwd: process.cwd(),
        env: childEnv,
        stdio: "inherit",
      });
      child.on("error", rejectPromise);
      child.on("exit", (code, signal) => {
        if (code === 0) return resolvePromise();
        rejectPromise(new Error(`E2E acceptance project failed for ${browser}${signal ? ` (${signal})` : ""} with exit code ${code ?? "unknown"}.`));
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    browserFailures.push(`${browserDisplayName(browser)}: ${message}`);
    console.error(`\n[FAIL] ${browserDisplayName(browser)} acceptance failed. Continuing so the remaining browser results are still collected.`);
    if (requestedBrowser !== "all") throw error;
    continue;
  }
}

if (browserFailures.length) {
  throw new Error([
    "Cross-browser acceptance completed with browser-specific failures:",
    ...browserFailures.map((failure) => `  - ${failure}`),
  ].join("\n"));
}
