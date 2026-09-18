import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const skipWebKit = ["1", "true", "yes"].includes(String(process.env.SKIP_WEBKIT_E2E || "").toLowerCase());

const steps = [
  "verify:test-dependencies",
  "verify:release-source",
  "verify:security",
  "verify:compatibility",
  "verify:accessibility",
  "verify:acceptance:coverage",
  "test:unit",
  "test:nuxt",
  "test:e2e:chromium",
  "test:e2e:firefox",
  ...(skipWebKit ? [] : ["test:e2e:webkit"]),
  "typecheck",
  "build",
];

if (skipWebKit) {
  console.warn("\nWARNING: WebKit E2E is explicitly skipped for this local verification run.");
  console.warn("A successful WebKit/Safari validation on a supported host or real Safari device is still required before deployment.\n");
}

for (const script of steps) {
  console.log(`\n=== npm run ${script} ===`);
  const result = spawnSync(npm, ["run", script], { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nSNCBT frontend release verification PASSED.");
