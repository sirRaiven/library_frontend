import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Phase 35-36 release compatibility contract", () => {
  it("keeps cross-browser authenticated acceptance and adds write-protected staging/production gates", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["test:acceptance:authenticated:cross-browser"]).toContain("--browser=all");
    expect(pkg.scripts["test:acceptance:staging"]).toContain("--scope=release");
    expect(pkg.scripts["test:acceptance:production"]).toContain("--target=production");
    expect(pkg.scripts["test:acceptance:production"]).toContain("--scope=release");
    expect(pkg.scripts["verify:deployment:local"]).toBeTruthy();
    expect(pkg.scripts["verify:deployment:production"]).toBeTruthy();
  });

  it("makes release acceptance read-only and forbids write mode outside localhost", () => {
    const runner = read("scripts/run-library-acceptance.mjs");
    expect(runner).toContain('"production"');
    expect(runner).toContain('.env.e2e.production');
    expect(runner).toContain("Release/staging/production acceptance is intentionally read-only");
    expect(runner).toContain('E2E_ALLOW_WRITES = "false"');
    expect(runner).toContain("Write acceptance is restricted to localhost");
    expect(runner).not.toMatch(/requiredReleaseEnv[\s\S]*E2E_STUDENT_BARCODE/);
  });

  it("supports production targets in the acceptance environment without requiring write fixtures", () => {
    const env = read("test/acceptance/helpers/env.ts");
    expect(env).toContain('"localhost" | "staging" | "production"');
    expect(env).toContain('process.env.E2E_TARGET === "production"');
    expect(env).toContain("dynamicFixtureValues");
    expect(env).toMatch(/if \(env\.allowWrites\)[\s\S]*assertTransactionalFixtures\(env\)/);
  });

  it("ships deployment compatibility verification and production E2E templates", () => {
    expect(existsSync(resolve(root, "scripts/verify-deployment-compatibility.mjs"))).toBe(true);
    expect(existsSync(resolve(root, ".env.e2e.production.example"))).toBe(true);
    const verifier = read("scripts/verify-deployment-compatibility.mjs");
    for (const token of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "X-Device-ID",
      "OPTIONS",
    ]) {
      expect(verifier).toContain(token);
    }
  });

  it("keeps accessibility and compatibility gates in production release verification", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["verify:accessibility"]).toBeTruthy();
    expect(pkg.scripts["verify:compatibility"]).toBeTruthy();
    expect(pkg.scripts["release:phase36"]).toBeTruthy();
  });

  it("keeps Firefox compatibility deterministic and exposes ordered local/release gates", () => {
    const pkg = JSON.parse(read("package.json"));
    const nuxt = read("nuxt.config.ts");
    const authAcceptance = read("test/acceptance/auth-public.acceptance.test.ts");
    const runner = read("scripts/run-library-acceptance.mjs");

    expect(nuxt).toMatch(/name:\s*["']Inter["'][\s\S]*provider:\s*["']none["']/);
    expect(authAcceptance).toContain("HTMLInputElement");
    expect(authAcceptance).toContain("passwordType");
    expect(runner).toContain("Production data must never be used for acceptance writes");
    expect(runner).toContain("browserFailures");
    expect(pkg.scripts["phase35:firefox"]).toBeTruthy();
    expect(pkg.scripts["phase35:webkit"]).toBeTruthy();
    expect(pkg.scripts["phase36:local"]).toBeTruthy();
    expect(pkg.scripts["test:order"]).toBeTruthy();
    expect(existsSync(resolve(root, "docs/TEST_COMMAND_ORDER.md"))).toBe(true);
  });

  it("locks the v17 browser/release stabilizations into the unit regression suite", () => {
    const pkg = JSON.parse(read("package.json"));
    const releaseSource = read("scripts/verify-release-source.mjs");
    const barcode = read("app/components/librarian/BarcodeCard.vue");
    const login = read("app/pages/index.vue");
    const runner = read("scripts/run-library-acceptance.mjs");
    const writeAcceptance = read("test/acceptance/write-workflows.acceptance.test.ts");

    expect(releaseSource).toContain("fileURLToPath");
    expect(releaseSource).not.toContain("import.meta.url).pathname");
    expect(barcode).toContain('document.createElement("canvas")');
    expect(barcode).toContain('canvas.toDataURL("image/png")');
    expect(barcode).not.toContain("ref<SVGSVGElement");
    expect(login).toContain('v-if="showPassword"');
    expect(login).toContain('key="password-visible"');
    expect(login).toContain('type="text"');
    expect(login).toContain('v-else');
    expect(login).toContain('key="password-hidden"');
    expect(login).toContain('type="password"');
    expect(runner).toContain("0xC0E90002");
    expect(runner).toContain("CodeIntegrity");
    expect(runner).toContain("webkit-wsl");
    expect(writeAcceptance).toContain("No selectable reservation title was returned");
    expect(writeAcceptance).toContain("selectionReason");
    expect(pkg.scripts["phase35:preview:prepare"]).toBeTruthy();
    expect(pkg.scripts["phase35:webkit:wsl"]).toBeTruthy();
    expect(pkg.scripts["test:acceptance:staging:wsl-webkit"]).toBeTruthy();
    expect(pkg.scripts["test:acceptance:production:wsl-webkit"]).toBeTruthy();
    expect(pkg.scripts["verify:deployment:preview"]).toBeTruthy();
    expect(pkg.scripts["phase36:local"]).toContain("verify:deployment:preview");
    expect(existsSync(resolve(root, "scripts/run-production-preview-check.mjs"))).toBe(true);
  });

  it("keeps Firefox password visibility and runtime diagnostics deterministic", () => {
    const login = read("app/pages/index.vue");
    const runtimeGuard = read("test/acceptance/helpers/runtime-guard.ts");
    const harness = read("test/acceptance/helpers/harness.ts");
    const acceptanceFiles = [
      "admin.acceptance.test.ts",
      "auth-public.acceptance.test.ts",
      "error-states.acceptance.test.ts",
      "faculty.acceptance.test.ts",
      "librarian.acceptance.test.ts",
      "responsive.acceptance.test.ts",
      "role-routes.acceptance.test.ts",
      "student.acceptance.test.ts",
      "write-workflows.acceptance.test.ts",
    ];

    expect(login).toContain('v-if="showPassword"');
    expect(login).toContain('type="text"');
    expect(login).toContain('v-else');
    expect(login).toContain('type="password"');
    expect(login).toContain("function revealPassword(): void");
    expect(login).toContain("showPassword.value = true");
    expect(login).toContain('@click="revealPassword"');
    expect(login).toContain("function hidePassword(): void");
    expect(login).toContain("showPassword.value = false");
    expect(login).toContain('@click="hidePassword"');
    expect(login).toContain("function safeInternalRedirect(value: unknown)");
    expect(login).toContain("target.origin !== baseOrigin");
    expect(login).toContain("external: true");
    expect(runtimeGuard).toContain("pendingConsoleDiagnostics");
    expect(runtimeGuard).toContain("argument.jsonValue()");
    expect(runtimeGuard).toContain('parsedUrl.pathname.startsWith("/_nuxt/")');
    expect(runtimeGuard).toContain("async assertClean()");
    expect(harness).toContain("waitForPageSettle");
    expect(harness).toContain('waitForLoadState("networkidle"');

    for (const file of acceptanceFiles) {
      const acceptance = read(`test/acceptance/${file}`);
      expect(acceptance.replaceAll("await guard.assertClean();", "")).not.toContain("guard.assertClean();");
      expect(acceptance).toContain("await guard.assertClean();");
    }
  });

  it("locks v18 production-preview identity, Docker WebKit, and dirty-fixture diagnostics", () => {
    const pkg = JSON.parse(read("package.json"));
    const preview = read("scripts/run-production-preview-check.mjs");
    const dockerRunner = read("scripts/run-playwright-docker-webkit.mjs");
    const runner = read("scripts/run-library-acceptance.mjs");
    const harness = read("test/acceptance/helpers/harness.ts");
    const writeAcceptance = read("test/acceptance/write-workflows.acceptance.test.ts");
    const order = read("docs/TEST_COMMAND_ORDER.md");

    expect(preview).toContain("Production preview identity verified");
    expect(preview).toMatch(/@vite\/client|vite-hmr|__vite_ping/);
    expect(pkg.scripts["phase35:webkit:docker"]).toBeTruthy();
    expect(pkg.scripts["phase35:cross-browser:docker-webkit"]).toBeTruthy();
    expect(dockerRunner).toContain("mcr.microsoft.com/playwright");
    expect(dockerRunner).toContain("run-server");
    expect(dockerRunner).toContain("<loopback>");
    expect(runner).toContain("browser-endpoint");
    expect(harness).toContain("browserWsEndpoint");
    expect(writeAcceptance).toContain("fixture state, not a reservation-creation failure");
    expect(writeAcceptance).toContain("Ready for Pickup");
    expect(order).toMatch(/one\s+frontend\s+test\s+command\s+at\s+a\s+time/i);
  });

  it("locks v19 preview cleanup and production download hand-off compatibility", () => {
    const preview = read("scripts/run-production-preview-check.mjs");
    const inventory = read("app/composables/useLibraryInventoryExcel.ts");
    const monitoring = read("app/components/admin/AdminMonitoringReportsPanel.vue");
    const cardDesigner = read("app/pages/librarian/library-card-designer.vue");
    const inventoryPage = read("app/pages/librarian/books/import.vue");
    const librarianAcceptance = read("test/acceptance/librarian.acceptance.test.ts");

    expect(preview).toContain("waitForPortRelease");
    expect(preview).toContain("taskkill");
    expect(preview).toContain("Production preview stopped and port");
    expect(inventory).toContain("optimized production bundle");
    expect(inventory).toContain('exceljs/dist/exceljs.bare.min.js');
    expect(inventory).toContain("window.setTimeout");
    expect(monitoring).toContain("window.setTimeout");
    expect(cardDesigner).toContain("window.setTimeout");
    expect(inventoryPage).toContain("isDownloadingTemplate");
    expect(inventoryPage).toContain("Template download failed");
    expect(librarianAcceptance).toContain("Template download failed");
    expect(librarianAcceptance).toContain("Promise.race");
  });

});
