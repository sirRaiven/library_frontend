import { spawn } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";

const root = process.cwd();
const outputDir = resolve(root, ".output");
const nuxtDir = resolve(root, ".nuxt");
const serverEntry = resolve(outputDir, "server/index.mjs");
const readyMarker = resolve(outputDir, ".sncbt-preview-ready.json");
const previewPort = Number.parseInt(process.env.E2E_PREVIEW_PORT || "3000", 10) || 3000;

function wait(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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

async function assertPreviewPortIdle() {
  const ipv4Free = await canBind("127.0.0.1");
  const ipv6Free = await canBind("::1", { ipv6Only: true });
  if (ipv4Free && ipv6Free) return;

  throw new Error([
    `Port ${previewPort} is already occupied on ${!ipv4Free && !ipv6Free ? "IPv4 and IPv6" : !ipv4Free ? "IPv4" : "IPv6"}.`,
    "Stop the Nuxt development server and any previous frontend preview before preparing Phase 35.",
    "Keep only Strapi running on port 1337.",
    "",
    "On Windows, identify the remaining listener with:",
    `  netstat -ano | findstr :${previewPort}`,
    "Then inspect the PID with:",
    "  tasklist /FI \"PID eq <PID>\"",
  ].join("\n"));
}

function run(command, args, env = process.env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolvePromise();
      rejectPromise(new Error(`${command} ${args.join(" ")} failed${signal ? ` (${signal})` : ""} with exit code ${code ?? "unknown"}.`));
    });
  });
}

async function reserveValidationPort() {
  return await new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer();
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePromise(port));
    });
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  try {
    child.kill("SIGTERM");
  } catch {}
  await Promise.race([
    new Promise((resolvePromise) => child.once("exit", resolvePromise)),
    wait(2_000),
  ]);
  if (child.exitCode !== null) return;

  if (process.platform === "win32" && child.pid) {
    await new Promise((resolvePromise) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        cwd: root,
        stdio: "ignore",
      });
      killer.once("error", () => resolvePromise());
      killer.once("exit", () => resolvePromise());
    });
  } else {
    try { child.kill("SIGKILL"); } catch {}
  }
}

async function validateGeneratedServer() {
  if (!existsSync(serverEntry)) {
    throw new Error("Nuxt build completed without .output/server/index.mjs.");
  }

  const port = await reserveValidationPort();
  const child = spawn(process.execPath, [serverEntry], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
  child.stdout?.resume();

  try {
    const deadline = Date.now() + 12_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error([
          "The freshly generated Nuxt .output server could not start.",
          "This usually means the build output is incomplete or inconsistent.",
          stderr.trim() || `Server exited with code ${child.exitCode}.`,
        ].join("\n"));
      }

      const reachable = await new Promise((resolvePromise) => {
        const socket = net.createConnection({ host: "127.0.0.1", port });
        socket.setTimeout(400);
        socket.once("connect", () => { socket.destroy(); resolvePromise(true); });
        socket.once("timeout", () => { socket.destroy(); resolvePromise(false); });
        socket.once("error", () => resolvePromise(false));
      });
      if (reachable) {
        console.log("[PASS] Fresh .output production preview integrity verified");
        return;
      }
      await wait(150);
    }
    throw new Error("The freshly generated Nuxt .output server did not bind during the integrity check.");
  } finally {
    await stopChild(child);
  }
}

await assertPreviewPortIdle();

console.log("\n=== SNCBT Clean Production Preview Preparation ===");
console.log("Removing stale Nuxt build output before rebuilding...");
rmSync(resolve(root, ".output"), { recursive: true, force: true });
rmSync(resolve(root, ".nuxt"), { recursive: true, force: true });

async function runNpmScript(scriptName) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && existsSync(npmExecPath)) {
    await run(process.execPath, [npmExecPath, "run", scriptName]);
    return;
  }

  if (process.platform === "win32") {
    const commandProcessor = process.env.ComSpec || process.env.COMSPEC || "cmd.exe";
    await run(commandProcessor, ["/d", "/s", "/c", `npm run ${scriptName}`]);
    return;
  }

  await run("npm", ["run", scriptName]);
}

await runNpmScript("build");
await validateGeneratedServer();

writeFileSync(
  readyMarker,
  JSON.stringify({
    preparedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
  }, null, 2) + "\n",
  "utf8",
);
console.log(`[PASS] Phase 35 production-preview marker written: ${readyMarker}`);
