import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";

const root = process.cwd();
const packageLockPath = resolve(root, "package-lock.json");
const previewRunner = resolve(root, "scripts/run-production-preview-check.mjs");
const serverPort = Number.parseInt(process.env.E2E_DOCKER_PLAYWRIGHT_PORT || "9323", 10) || 9323;
const containerName = `sncbt-playwright-webkit-${process.pid}`;

if (!existsSync(packageLockPath)) {
  throw new Error("package-lock.json is required so Docker WebKit uses the exact project Playwright version.");
}
if (!existsSync(previewRunner)) {
  throw new Error("Production-preview runner is missing.");
}

const lock = JSON.parse(readFileSync(packageLockPath, "utf8"));
const playwrightVersion = lock.packages?.["node_modules/playwright-core"]?.version;
if (!playwrightVersion) {
  throw new Error("Unable to resolve the installed playwright-core version from package-lock.json.");
}

const image = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
const endpoint = `ws://127.0.0.1:${serverPort}/`;

function runChecked(command, commandArgs, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", (error) => rejectPromise(new Error(`${label} could not start: ${error.message}`)));
    child.on("exit", (code, signal) => {
      if (code === 0) return resolvePromise();
      rejectPromise(new Error(`${label} failed${signal ? ` (${signal})` : ""} with exit code ${code ?? "unknown"}.`));
    });
  });
}

function dockerAvailable() {
  const check = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return check.status === 0;
}

async function waitForPort(port, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      await new Promise((resolvePromise, rejectPromise) => {
        const socket = net.createConnection({ host: "127.0.0.1", port });
        const timer = setTimeout(() => {
          socket.destroy();
          rejectPromise(new Error("timeout"));
        }, 1_000);
        socket.once("connect", () => {
          clearTimeout(timer);
          socket.destroy();
          resolvePromise();
        });
        socket.once("error", (error) => {
          clearTimeout(timer);
          socket.destroy();
          rejectPromise(error);
        });
      });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise(resolvePromise => setTimeout(resolvePromise, 500));
    }
  }
  throw new Error(`Docker Playwright server did not become reachable on 127.0.0.1:${port}: ${lastError || "timeout"}`);
}

function cleanupContainer() {
  spawnSync("docker", ["rm", "-f", containerName], {
    cwd: root,
    stdio: "ignore",
  });
}

if (process.platform !== "win32") {
  throw new Error("The Docker WebKit fallback is intended for the Windows Phase 35 host where native WebKit is blocked.");
}
if (!dockerAvailable()) {
  throw new Error([
    "Docker Desktop is not running or its engine is unavailable.",
    "Start Docker Desktop, wait until `docker info` succeeds, then rerun:",
    "  npm run phase35:webkit:docker",
  ].join("\n"));
}

console.log("\n=== SNCBT WebKit Docker Fallback ===");
console.log(`Playwright : ${playwrightVersion}`);
console.log(`Image      : ${image}`);
console.log(`Endpoint   : ${endpoint}`);
console.log("Security   : Windows Smart App Control / WDAC remains unchanged");
console.log("Network    : Playwright <loopback> exposure maps the remote browser back to the local preview/API");

console.log("\n--- Ensuring matching Playwright Docker image ---");
await runChecked("docker", ["pull", image], "Docker image pull");

cleanupContainer();
const docker = spawn("docker", [
  "run",
  "--rm",
  "--init",
  "--name", containerName,
  "-p", `127.0.0.1:${serverPort}:${serverPort}`,
  "--workdir", "/home/pwuser",
  "--user", "pwuser",
  image,
  "/bin/sh", "-lc",
  `npx -y playwright@${playwrightVersion} run-server --port ${serverPort} --host 0.0.0.0`,
], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

docker.on("error", (error) => {
  console.error(`Docker Playwright server failed to start: ${error.message}`);
});

let terminating = false;
async function cleanupAndExit(signal) {
  if (terminating) return;
  terminating = true;
  cleanupContainer();
  process.kill(process.pid, signal);
}
process.once("SIGINT", () => void cleanupAndExit("SIGINT"));
process.once("SIGTERM", () => void cleanupAndExit("SIGTERM"));

try {
  await waitForPort(serverPort);
  console.log(`[PASS] Docker Playwright server reachable at ${endpoint}`);

  await runChecked(process.execPath, [
    previewRunner,
    "--check=acceptance",
    "--browser=webkit",
    `--browser-endpoint=${endpoint}`,
    "--browser-expose-network=<loopback>",
    "--browser-remote-label=Docker",
  ], "Docker WebKit production-preview acceptance");
} finally {
  cleanupContainer();
}
