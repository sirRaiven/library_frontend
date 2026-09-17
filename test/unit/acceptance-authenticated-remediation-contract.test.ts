import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("authenticated acceptance remediation contract", () => {
  it("setup helper sends a stable device identifier to guarded Strapi authentication", () => {
    const source = read("scripts/setup-library-acceptance-auth.mjs");
    expect(source).toContain('"X-Device-ID"');
    expect(source).toContain("deviceId");
  });

  it("Student security acceptance opens the password section before checking the submit button", () => {
    const source = read("test/acceptance/student.acceptance.test.ts");
    expect(source).toContain('name: "Change Password", exact: true');
  });

  it("reservation acceptance waits for policy readiness instead of reading the initial disabled state", () => {
    const source = read("test/acceptance/student.acceptance.test.ts");
    expect(source).toContain("Reservation policy did not become ready");
  });

  it("Excel template acceptance allows first-load ExcelJS compilation to complete", () => {
    const source = read("test/acceptance/librarian.acceptance.test.ts");
    expect(source).toContain("90_000");
  });

  it("generic UI audit does not treat component-internal tabindex -1 controls as page-level keyboard failures", () => {
    const source = read("test/acceptance/helpers/ui-audit.ts");
    expect(source).not.toContain("tabIndex >= 0");
    expect(source).toContain("hidden controls must not be keyboard reachable");
  });

  it("acceptance harness reuses and resynchronizes authenticated role cookies across hard navigations", () => {
    const source = read("test/acceptance/helpers/harness.ts");
    expect(source).toContain("roleCookieCache");
    expect(source).toContain("pageRoleCache");
    expect(source).toContain("syncRoleCookieCache");
    expect(source).toContain('cookie.name === "auth-session-hint"');
    expect(source).toContain("page.context().addCookies");
    expect(source).toContain("page.context().cookies");
    expect(source).toContain("roleCookieCache.delete(role)");
  });

  it("acceptance project shares the role session cache across test files", () => {
    const source = read("vitest.config.ts");
    expect(source).toContain("isolate: false");
  });

});
