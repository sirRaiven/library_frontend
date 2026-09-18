import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("cross-browser and production release commands exist", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts["test:acceptance:authenticated:cross-browser"] ?? "", /--browser=all/);
  assert.match(pkg.scripts["test:acceptance:staging"] ?? "", /--scope=release/);
  assert.match(pkg.scripts["test:acceptance:production"] ?? "", /--target=production/);
  assert.ok(pkg.scripts["verify:deployment:local"]);
  assert.ok(pkg.scripts["verify:deployment:production"]);
});

test("release mode is remote-safe and production-aware", () => {
  const runner = read("scripts/run-library-acceptance.mjs");
  assert.match(runner, /"production"/);
  assert.match(runner, /\.env\.e2e\.production/);
  assert.match(runner, /Release\/staging\/production acceptance is intentionally read-only/);
  assert.match(runner, /E2E_ALLOW_WRITES = "false"/);
  assert.match(runner, /Write acceptance is restricted to localhost/);
});

test("deployment compatibility verifier checks headers and CORS", () => {
  assert.equal(existsSync(resolve(root, "scripts/verify-deployment-compatibility.mjs")), true);
  const verifier = read("scripts/verify-deployment-compatibility.mjs");
  const lower = verifier.toLowerCase();
  for (const token of ["content-security-policy", "strict-transport-security", "access-control-allow-origin", "x-device-id", "options", "cross-origin-resource-policy", "cross-origin-embedder-policy", "backendsecurityheaders"]) {
    assert.ok(lower.includes(token), `deployment verifier is missing ${token}`);
  }
});


test("phase35 firefox stability avoids remote Inter proxying and browser-brittle password assertions", () => {
  const nuxt = read("nuxt.config.ts");
  const authTest = read("test/acceptance/auth-public.acceptance.test.ts");
  assert.match(nuxt, /name:\s*["']Inter["'][\s\S]*provider:\s*["']none["']/);
  assert.match(authTest, /HTMLInputElement[\s\S]*\.type/);
});

test("cross-browser runner aggregates browser results and preserves the production-write safety contract", () => {
  const runner = read("scripts/run-library-acceptance.mjs");
  assert.match(runner, /Production data must never be used for acceptance writes/);
  assert.match(runner, /browserFailures/);
  assert.match(runner, /continue/);
});

test("local and production phase36 commands are separated and an ordered validation runbook is shipped", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.scripts["phase35:firefox"]);
  assert.ok(pkg.scripts["phase35:webkit"]);
  assert.ok(pkg.scripts["phase36:local"]);
  assert.ok(pkg.scripts["test:order"]);
  assert.equal(existsSync(resolve(root, "docs/TEST_COMMAND_ORDER.md")), true);
});

test("release-source verification resolves Windows paths with fileURLToPath", () => {
  const verifier = read("scripts/verify-release-source.mjs");
  assert.match(verifier, /fileURLToPath/);
  assert.doesNotMatch(verifier, /\.pathname\)/);
});

test("barcode rendering is DOM-type independent and produces an image data URL", () => {
  const component = read("app/components/librarian/BarcodeCard.vue");
  assert.match(component, /document\.createElement\(["']canvas["']\)/);
  assert.match(component, /toDataURL\(["']image\/png["']\)/);
  assert.match(component, /barcodeDataUrl/);
  assert.doesNotMatch(component, /ref<SVGSVGElement/);
});

test("phase35 uses a built production preview instead of the Vite development server", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.scripts["phase35:preview:prepare"]);
  assert.match(pkg.scripts["phase35:chromium"] ?? "", /run-production-preview-check/);
  assert.match(pkg.scripts["phase35:firefox"] ?? "", /run-production-preview-check/);
  assert.match(pkg.scripts["phase35:webkit"] ?? "", /run-production-preview-check/);
  assert.match(pkg.scripts["phase35:cross-browser"] ?? "", /phase35:preview:prepare/);
  assert.equal(existsSync(resolve(root, "scripts/run-production-preview-check.mjs")), true);
});

test("webkit integrity failures are diagnosed and WSL WebKit is available without lowering Windows security", () => {
  const runner = read("scripts/run-library-acceptance.mjs");
  const harness = read("test/acceptance/helpers/harness.ts");
  const pkg = JSON.parse(read("package.json"));
  assert.match(runner, /0xC0E90002/i);
  assert.match(runner, /CodeIntegrity/i);
  assert.match(runner, /webkit-wsl/i);
  assert.match(harness, /webkit-wsl/i);
  assert.ok(pkg.scripts["test:browsers:install:webkit-wsl"]);
  assert.ok(pkg.scripts["phase35:webkit:wsl"]);
  assert.ok(pkg.scripts["phase35:cross-browser:wsl-webkit"]);
  assert.ok(pkg.scripts["test:acceptance:staging:wsl-webkit"]);
  assert.ok(pkg.scripts["test:acceptance:production:wsl-webkit"]);
});

test("firefox password visibility forces a stable input remount", () => {
  const page = read("app/pages/index.vue");
  assert.match(page, /:key=["']showPassword \? ["']password-visible["'] : ["']password-hidden["']["']/);
});

test("reservation write acceptance diagnoses the search response before selecting a title", () => {
  const testSource = read("test/acceptance/write-workflows.acceptance.test.ts");
  assert.match(testSource, /reservation-books/);
  assert.match(testSource, /No selectable reservation title was returned/);
  assert.match(testSource, /selectionReason/);
});

test("phase36 deployment verification targets the built local preview", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.scripts["verify:deployment:preview"]);
  assert.match(pkg.scripts["phase36:local"] ?? "", /verify:deployment:preview/);
});

test("phase35 rejects Vite/dev-port contamination before browser acceptance", () => {
  const preview = read("scripts/run-production-preview-check.mjs");
  assert.match(preview, /Production preview identity verified/);
  assert.match(preview, /@vite\/client|vite-hmr|__vite_ping/);
  assert.match(preview, /Do not run frontend acceptance commands concurrently/);
});

test("docker WebKit fallback uses the project-matching Playwright version and remote loopback exposure", () => {
  const pkg = JSON.parse(read("package.json"));
  const dockerRunner = read("scripts/run-playwright-docker-webkit.mjs");
  const acceptanceRunner = read("scripts/run-library-acceptance.mjs");
  const harness = read("test/acceptance/helpers/harness.ts");
  assert.ok(pkg.scripts["phase35:webkit:docker"]);
  assert.ok(pkg.scripts["phase35:cross-browser:docker-webkit"]);
  assert.match(dockerRunner, /node_modules\/playwright-core/);
  assert.match(dockerRunner, /mcr\.microsoft\.com\/playwright/);
  assert.match(dockerRunner, /run-server/);
  assert.match(dockerRunner, /<loopback>/);
  assert.match(acceptanceRunner, /browser-endpoint/);
  assert.match(acceptanceRunner, /exposeNetwork/);
  assert.match(harness, /browserWsEndpoint/);
  assert.match(harness, /exposeNetwork/);
});

test("write acceptance distinguishes a dirty active-reservation fixture from an application failure", () => {
  const source = read("test/acceptance/write-workflows.acceptance.test.ts");
  assert.match(source, /fixture state, not a reservation-creation failure/i);
  assert.match(source, /Ready for Pickup/);
  assert.match(source, /Do not repeatedly rerun the write suite/);
});

test("production preview cleanup releases port 3000 before the next browser run", () => {
  const preview = read("scripts/run-production-preview-check.mjs");
  assert.match(preview, /waitForPortRelease/);
  assert.match(preview, /taskkill/);
  assert.match(preview, /Production preview stopped and port/);
  assert.match(preview, /port .* is still occupied by another process/);
});

test("browser-generated downloads keep Blob URLs alive through the hand-off", () => {
  const inventory = read("app/composables/useLibraryInventoryExcel.ts");
  const monitoring = read("app/components/admin/AdminMonitoringReportsPanel.vue");
  const cardDesigner = read("app/pages/librarian/library-card-designer.vue");

  for (const source of [inventory, monitoring, cardDesigner]) {
    assert.match(source, /setTimeout\(\(\) => \{/);
    assert.match(source, /URL\.revokeObjectURL/);
  }
  assert.match(inventory, /optimized production bundle/);
});

test("inventory template download exposes progress and a user-friendly failure state", () => {
  const page = read("app/pages/librarian/books/import.vue");
  assert.match(page, /isDownloadingTemplate/);
  assert.match(page, /Template download failed/);
  assert.match(page, /The Excel template could not be created/);
  assert.match(page, /:loading="isDownloadingTemplate"/);
});

test("phase35 preparation performs a clean build and validates the generated production server", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts["phase35:preview:prepare"] ?? "", /prepare-production-preview/);
  assert.equal(existsSync(resolve(root, "scripts/prepare-production-preview.mjs")), true);
  const prepare = read("scripts/prepare-production-preview.mjs");
  assert.match(prepare, /rmSync\(resolve\(root, "\.output"\)/);
  assert.match(prepare, /rmSync\(resolve\(root, "\.nuxt"\)/);
  assert.match(prepare, /Fresh \.output production preview integrity verified/);
  assert.match(prepare, /\.sncbt-preview-ready\.json/);
});

test("production preview preflight rejects dual-stack port contamination and requires the prepared build marker", () => {
  const preview = read("scripts/run-production-preview-check.mjs");
  assert.match(preview, /127\.0\.0\.1/);
  assert.match(preview, /::1/);
  assert.match(preview, /ipv6Only/);
  assert.match(preview, /\.sncbt-preview-ready\.json/);
  assert.match(preview, /netstat -ano \| findstr :\$\{previewPort\}/);
  assert.match(preview, /directPreviewUrl/);
});

test("local phase36 uses the same clean production-preview preparation gate", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts["phase36:local"] ?? "", /phase35:preview:prepare/);
});


test("phase35 preparation launches npm portably on Windows Node 24", () => {
  const prepare = read("scripts/prepare-production-preview.mjs");
  assert.match(prepare, /process\.env\.npm_execpath/);
  assert.match(prepare, /process\.execPath/);
  assert.match(prepare, /ComSpec|COMSPEC/);
  assert.doesNotMatch(prepare, /spawn\(["']npm\.cmd["']/);
});
