import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Administrator unified reports contract", () => {
  it("exposes one Reports destination in Administrator navigation", () => {
    const layout = source("app/layouts/admin.vue");
    expect(layout).toContain('label: "Reports"');
    expect(layout).toContain('to: "/admin/reports"');
    expect(layout).not.toContain('label: "Monitoring Reports"');
  });

  it("combines Library and Monitoring reports in one page", () => {
    const page = source("app/pages/admin/reports.vue");
    expect(page).toContain("Library Reports");
    expect(page).toContain("Monitoring Reports");
    expect(page).toContain("AdminMonitoringReportsPanel");
  });

  it("keeps the legacy monitoring-report URL as a redirect only", () => {
    const legacyPage = source("app/pages/admin/monitoring-reports.vue");
    expect(legacyPage).toContain('path: "/admin/reports"');
    expect(legacyPage).toContain('view: "monitoring"');
    expect(legacyPage).not.toContain("Report Configuration");
  });

  it("generates Library and audit reports without adding mutations", () => {
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
