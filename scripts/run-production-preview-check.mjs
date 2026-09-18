import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...rest] = argument.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const check = args.get("check") || "acceptance";
const browser = args.get("browser") || "chromium";
const webkitChannel = args.get("webkit-channel") || "";
const browserEndpoint = args.get("browser-endpoint") || "";
const browserExposeNetwork = args.get("browser-expose-network") || "<loopback>";
const browserRemoteLabel = args.get("browser-remote-label") || "";

if (!["acceptance", "deployment"].includes(check)) {
  throw new Error(`Unsupported production-preview check: ${check}.`);
}
if (!["chromium", "firefox", "webkit", "all"].includes(browser)) {
  throw new Error(`Unsupported production-preview browser: ${browser}.`);
}
if (webkitChannel && webkitChannel !== "webkit-wsl") {
  throw new Error(`Unsupported production-preview WebKit channel: ${webkitChannel}.`);
}
if (webkitChannel && browserEndpoint) {
  throw new Error("Use either a production-preview WebKit channel or a remote browser endpoint, not both.");
}

const root = process.cwd();
const serverEntry = resolve(root, ".output/server/index.mjs");
const readyMarker = resolve(root, ".output/.sncbt-preview-ready.json");
const previewPort = Number.parseInt(process.env.E2E_PREVIEW_PORT || "3000", 10) || 3000;
const previewHost = process.env.E2E_PREVIEW_HOST || "127.0.0.1";
const directPreviewUrl = `http://127.0.0.1:${previewPort}`;
const previewUrl = `http://localhost:${previewPort}`;

function latestMtime(pathname) {
  if (!existsSync(pathname)) return 0;
  const stat = statSync(pathname);
  if (!stat.isDirectory()) return stat.mtimeMs;

  let latest = stat.mtimeMs;
  for (const entry of readdirSync(pathname)) {
    latest = Math.max(latest, latestMtime(resolve(pathname, entry)));
  }
  return latest;
}

function assertFreshBuild() {
  if (!existsSync(serverEntry) || !existsSync(readyMarker)) {
    throw new Error([
      "The clean production preview has not been prepared for this source tree.",
      "Run:",
      "  npm run phase35:preview:prepare",
      "Then rerun the Phase 35 browser command.",
      "",
      "The preparation step removes stale .output/.nuxt data, rebuilds Nuxt, and verifies that the generated server can start.",
    ].join("\n"));
  }

  const outputTime = statSync(serverEntry).mtimeMs;
  const markerTime = statSync(readyMarker).mtimeMs;
  const sourceTime = Math.max(
    latestMtime(resolve(root, "app")),
    latestMtime(resolve(root, "nuxt.config.ts")),
    latestMtime(resolve(root, "package.json")),
    latestMtime(resolve(root, "package-lock.json")),
  );

  if (markerTime + 1000 < sourceTime || markerTime + 1000 < outputTime) {
    throw new Error([
      "The prepared production preview no longer matches the current frontend source/build output.",
      "Run:",
      "  npm run phase35:preview:prepare",
      "before using individual Phase 35 browser commands.",
    ].join("\n"));
  }
}

async function canBind(host, options = {}) {
  return await new Promise((resolvePromise) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (error) => {
      const code = error && typeof error === "object" ? error.code : "";
      if (code === "EAFNOSUPPORT" || code === "EADDRNOTAVAIL") return resolvePromise(true);
      resolvePromise(false);
    });
    server.listen({ port: previewPort, host, ...options }, () => {
      server.close(() => resolvePromise(true));
    });
  });
}

async function previewPortsAvailable() {
  const ipv4 = await canBind("127.0.0.1");
  const ipv6 = await canBind("::1", { ipv6Only: true });
  return { ipv4, ipv6, available: ipv4 && ipv6 };
}

async function assertPortAvailable() {
  const status = await previewPortsAvailable();
  if (status.available) return;

  const occupied = !status.ipv4 && !status.ipv6
    ? "IPv4 and IPv6"
    : !status.ipv4
      ? "IPv4"
      : "IPv6";

  throw new Error([
    `Production-preview port ${previewPort} is already in use on ${occupied}.`,
    "Stop every Nuxt development/preview/test process before Phase 35/36 production-preview validation.",
    "Keep Strapi running on its configured backend port.",
    "",
    "On Windows, identify the listener with:",
    `  netstat -ano | findstr :${previewPort}`,
    "Then inspect each PID with:",
    "  tasklist /FI \"PID eq <PID>\"",
    "",
    "The runner checks both 127.0.0.1 and ::1 so an IPv6 Nuxt/Vite listener cannot contaminate a localhost production-preview test.",
  ].join("\n"));
}

async function waitForPreview(child) {
  const deadline = Date.now() + 45_000;
  let lastError = "";

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error([
        `Nuxt production preview exited before readiness with code ${child.exitCode}.`,
        "The .output build may be incomplete or inconsistent.",
        "Run npm run phase35:preview:prepare and retry.",
      ].join("\n"));
    }

    try {
      // Probe the exact IPv4 host used by the spawned Nitro process. Using
      // localhost here can accidentally reach a separate ::1 Vite listener.
      const response = await fetch(`${directPreviewUrl}/`, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Nuxt production preview did not become ready at ${directPreviewUrl}: ${lastError || "timeout"}`);
}

async function readPreviewHtml(url) {
  const response = await fetch(`${url}/`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (response.status >= 500) {
    throw new Error(`Production preview returned HTTP ${response.status} at ${url}.`);
  }
  return await response.text();
}

function assertNotViteDev(html, url) {
  const looksLikeViteDev = /(?:\/_nuxt\/)?@vite\/client|vite-hmr|__vite_ping/i.test(html);
  if (!looksLikeViteDev) return;

  throw new Error([
    `${url} is serving a Vite/Nuxt development page instead of the built .output application.`,
    "Do not run frontend acceptance commands concurrently.",
    "Stop every Nuxt development/test process using port 3000, keep only Strapi running, then run npm run phase35:preview:prepare before retrying.",
    "",
    "On Windows:",
    `  netstat -ano | findstr :${previewPort}`,
  ].join("\n"));
}

async function assertProductionPreviewIdentity(child) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  if (child.exitCode !== null) {
    throw new Error([
      `Nuxt production preview exited after readiness with code ${child.exitCode}.`,
      "The generated .output server is not stable.",
      "Run npm run phase35:preview:prepare to produce and validate a fresh build.",
    ].join("\n"));
  }

  // First prove that the spawned IPv4 Nitro server itself is production output.
  const directHtml = await readPreviewHtml(directPreviewUrl);
  assertNotViteDev(directHtml, directPreviewUrl);

  // Then verify the localhost origin that the browser will actually use. This
  // catches an unexpected ::1 dev listener that appears after the preflight.
  const localhostHtml = await readPreviewHtml(previewUrl);
  assertNotViteDev(localhostHtml, previewUrl);

  if (child.exitCode !== null) {
    throw new Error(`Nuxt production preview exited during identity verification with code ${child.exitCode}.`);
  }

  console.log("[PASS] Production preview identity verified on 127.0.0.1 and localhost (no Vite HMR client)");
}

async function runChild(commandArgs, env) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, commandArgs, {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.on("error", rejectPromise);
    child.on("exit", (code, signal) => {
      if (code === 0) return resolvePromise();
      rejectPromise(new Error(`Production-preview check failed${signal ? ` (${signal})` : ""} with exit code ${code ?? "unknown"}.`));
    });
  });
}

function wait(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

async function waitForPortRelease(timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await previewPortsAvailable();
    if (status.available) return true;
    await wait(150);
  }
  return (await previewPortsAvailable()).available;
}

async function forceKillPreviewTree(child) {
  if (!child.pid) return;

  if (process.platform === "win32") {
    await new Promise((resolvePromise) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        cwd: root,
        stdio: "ignore",
      });
      killer.once("error", () => resolvePromise());
      killer.once("exit", () => resolvePromise());
    });
    return;
  }

  try {
    child.kill("SIGKILL");
  } catch {
    // The child may already have exited between the checks above.
  }
}

async function stopPreview(child) {
  if (child.exitCode === null) {
    try {
      child.kill("SIGTERM");
    } catch {
      // Continue to the tree-kill fallback below.
    }

    await Promise.race([
      new Promise(resolvePromise => child.once("exit", resolvePromise)),
      wait(3_000),
    ]);
  }

  if (child.exitCode === null) {
    await forceKillPreviewTree(child);
    await Promise.race([
      new Promise(resolvePromise => child.once("exit", resolvePromise)),
      wait(3_000),
    ]);
  }

  const released = await waitForPortRelease();
  if (released) {
    console.log(`[PASS] Production preview stopped and port ${previewPort} released on IPv4/IPv6`);
  } else {
    console.warn(`[WARN] Production preview process ended, but port ${previewPort} is still occupied by another process on IPv4 or IPv6.`);
    console.warn(`Run: netstat -ano | findstr :${previewPort}`);
    console.warn("Before the next Phase 35 command, close the extra frontend process. Keep Strapi on port 1337 running.");
  }
}

assertFreshBuild();
await assertPortAvailable();

console.log(`\n=== SNCBT Nuxt Production Preview ===`);
console.log(`URL    : ${previewUrl}`);
console.log(`Direct : ${directPreviewUrl}`);
console.log(`Check  : ${check === "acceptance" ? `Acceptance (${browser}${webkitChannel ? `, ${webkitChannel}` : browserEndpoint ? `, ${browserRemoteLabel || "remote"}` : ""})` : "Deployment compatibility"}`);
console.log("Backend: must remain running separately (normally http://localhost:1337)");

const preview = spawn(process.execPath, [serverEntry], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOST: previewHost,
    PORT: String(previewPort),
    NITRO_HOST: previewHost,
    NITRO_PORT: String(previewPort),
  },
  stdio: "inherit",
});

let terminating = false;
const cleanupForSignal = async (signal) => {
  if (terminating) return;
  terminating = true;
  await stopPreview(preview);
  process.kill(process.pid, signal);
};
process.once("SIGINT", () => void cleanupForSignal("SIGINT"));
process.once("SIGTERM", () => void cleanupForSignal("SIGTERM"));

try {
  await waitForPreview(preview);
  console.log(`[PASS] Production preview reachable at ${directPreviewUrl}`);
  await assertProductionPreviewIdentity(preview);

  const childEnv = { ...process.env };

  if (check === "deployment") {
    await runChild([
      resolve(root, "scripts/verify-deployment-compatibility.mjs"),
      "--target=localhost",
      `--frontend-url=${previewUrl}`,
    ], childEnv);
  } else {
    const commandArgs = [
      resolve(root, "scripts/run-library-acceptance.mjs"),
      "--target=localhost",
      `--browser=${browser}`,
      "--scope=authenticated-readonly",
      `--frontend-url=${previewUrl}`,
    ];
    if (webkitChannel) commandArgs.push(`--webkit-channel=${webkitChannel}`);
    if (browserEndpoint) commandArgs.push(`--browser-endpoint=${browserEndpoint}`);
    if (browserExposeNetwork) commandArgs.push(`--browser-expose-network=${browserExposeNetwork}`);
    if (browserRemoteLabel) commandArgs.push(`--browser-remote-label=${browserRemoteLabel}`);
    await runChild(commandArgs, childEnv);
  }
} finally {
  await stopPreview(preview);
}
