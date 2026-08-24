import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Administrator Reports Center contract", () => {
  it("exposes the Reports Center in the Administrator navigation", () => {
    const layout = source("app/layouts/admin.vue");
    expect(layout).toContain('to: "/admin/reports"');
    expect(layout).toContain("Reports Center");
  });

  it("reuses the existing monitoring and audit workspaces", () => {
    const page = source("app/pages/admin/reports.vue");
    expect(page).toContain('to="/admin/monitoring-reports"');
    expect(page).toContain('to="/admin/audit-logs"');
  });

  it("generates Library reports without adding a mutation workflow", () => {
    const page = source("app/pages/admin/reports.vue");
    const composable = source("app/composables/useAdminReports.ts");
    expect(page).toContain("libraryReports.generate");
    expect(composable).toContain('"/api/admin-reports/audit"');
    expect(composable).not.toMatch(/method:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
  });

  it("keeps formal report export options available", () => {
    const page = source("app/pages/admin/reports.vue");
    expect(page).toContain("exportCurrent('pdf')");
    expect(page).toContain("exportCurrent('docx')");
    expect(page).toContain("exportCurrent('xlsx')");
    expect(page).toContain("printCurrent");
  });
});
