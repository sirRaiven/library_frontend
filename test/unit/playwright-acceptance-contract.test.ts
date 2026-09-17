import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const requiredFiles = [
  ".env.e2e.example",
  "scripts/run-library-acceptance.mjs",
  "scripts/verify-acceptance-test-coverage.mjs",
  "test/acceptance/helpers/env.ts",
  "test/acceptance/helpers/harness.ts",
  "test/acceptance/helpers/runtime-guard.ts",
  "test/acceptance/helpers/routes.ts",
  "test/acceptance/helpers/ui-audit.ts",
  "test/acceptance/preflight.acceptance.test.ts",
  "test/acceptance/auth-public.acceptance.test.ts",
  "test/acceptance/role-routes.acceptance.test.ts",
  "test/acceptance/student.acceptance.test.ts",
  "test/acceptance/librarian.acceptance.test.ts",
  "test/acceptance/faculty.acceptance.test.ts",
  "test/acceptance/admin.acceptance.test.ts",
  "test/acceptance/error-states.acceptance.test.ts",
  "test/acceptance/responsive.acceptance.test.ts",
  "test/acceptance/write-workflows.acceptance.test.ts",
  "docs/PLAYWRIGHT_ACCEPTANCE_PHASES_26_34.md",
];

function vueFiles(folder: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) result.push(...vueFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".vue")) result.push(path);
  }
  return result;
}

function routeForPage(file: string): string {
  let route = `/${relative(resolve(root, "app/pages"), file).replace(/\\/g, "/").replace(/\.vue$/, "")}`;
  route = route.replace(/\/index$/, "");
  return route || "/";
}

describe("Playwright acceptance phases 26-34 contract", () => {
  it("ships the localhost/staging acceptance harness", () => {
    for (const file of requiredFiles) expect(existsSync(resolve(root, file)), file).toBe(true);
  });

  it("exposes explicit localhost, write, cross-browser, and release commands", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    for (const name of [
      "test:acceptance",
      "test:acceptance:local",
      "test:acceptance:local:write",
      "test:acceptance:cross-browser",
      "test:acceptance:release:local",
      "test:acceptance:staging",
      "verify:acceptance:coverage",
    ]) expect(scripts[name], name).toBeTruthy();
  });

  it("keeps every protected page represented by the acceptance route manifest", () => {
    const manifest = read("test/acceptance/helpers/routes.ts");
    for (const role of ["admin", "librarian", "student", "faculty"]) {
      for (const file of vueFiles(resolve(root, `app/pages/${role}`))) {
        const route = routeForPage(file);
        expect(manifest, `missing acceptance route ${route}`).toContain(`"${route}"`);
      }
    }
    expect(manifest).toContain('export const publicRoutes = ["/", "/student-registration"] as const;');
    expect(manifest).toContain('export const compatibilityRoutes = ["/faculty-access"] as const;');
  });

  it("includes runtime console/network guarding and write-safety gates", () => {
    const guard = read("test/acceptance/helpers/runtime-guard.ts");
    const env = read("test/acceptance/helpers/env.ts");
    const runner = read("scripts/run-library-acceptance.mjs");
    expect(guard).toContain('page.on("pageerror"');
    expect(guard).toContain('page.on("requestfailed"');
    expect(guard).toContain('page.on("response"');
    expect(env).toContain("E2E_ALLOW_WRITES");
    expect(env).toContain("E2E_ALLOW_REMOTE_WRITES");
    expect(runner).toContain("Production data must never be used for acceptance writes");
    expect(runner).toContain("=== SNCBT Library E2E Acceptance Tests ===");
    expect(runner).toContain("Runner  : Vitest + Playwright Core");
    expect(runner).toContain("npm run test:browsers:install");
    expect(runner).toContain("executablePath()");
  });


  it("keeps Phase 27 entry semantics aligned with the current frontend", () => {
    const routes = read("test/acceptance/helpers/routes.ts");
    const auth = read("test/acceptance/auth-public.acceptance.test.ts");
    const verifier = read("scripts/verify-acceptance-test-coverage.mjs");
    expect(routes).toContain('export const publicRoutes = ["/", "/student-registration"] as const;');
    expect(routes).toContain('export const compatibilityRoutes = ["/faculty-access"] as const;');
    expect(auth).toContain("authentication and entry workflows");
    expect(auth).toContain("expect.poll");
    expect(auth).toContain("/faculty/dashboard");
    expect(verifier).toContain("Coverage definition check only; no browser navigation has been executed.");
  });

  it("uses state-based keyboard reachability checks instead of brittle forced-focus identity", () => {
    const audit = read("test/acceptance/helpers/ui-audit.ts");
    expect(audit).toContain("hiddenKeyboardLeaks");
    expect(audit).toContain("element.tabIndex");
    expect(audit).toContain("aria-labelledby");
    expect(audit).toContain("outerHTML");
    expect(audit).not.toContain("document.activeElement === element");
  });

  it("documents the Vitest + Playwright Core runner boundary", () => {
    const docs = read("docs/PLAYWRIGHT_ACCEPTANCE_PHASES_26_34.md");
    expect(docs).toContain("Do not run `npx playwright test`");
    expect(docs).toContain("npm run test:acceptance");
  });
});
