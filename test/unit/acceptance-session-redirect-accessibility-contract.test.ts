import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Phase 26-34 v10 acceptance stability contract", () => {
  it("keeps the rotated refresh-cookie cache synchronized after protected hard navigation", () => {
    const harness = read("test/acceptance/helpers/harness.ts");
    expect(harness).toContain("pageRoleCache");
    expect(harness).toContain("syncRoleCookieCache");
    expect(harness).toContain('cookie.name === "auth-session-hint"');
    expect(harness).toContain("await syncRoleCookieCache(page)");
  });

  it("recognizes the Monitoring Reports compatibility redirect", () => {
    const routes = read("test/acceptance/role-routes.acceptance.test.ts");
    expect(routes).toContain('"/admin/monitoring-reports": "/admin/reports"');
  });

  it("keeps Librarian shell icon controls explicitly named", () => {
    const layout = read("app/layouts/librarian.vue");
    expect(layout).toContain("Open navigation menu");
    expect(layout).toContain("Collapse navigation sidebar");
    expect(layout).toContain('aria-label="Change color mode"');
  });
});
