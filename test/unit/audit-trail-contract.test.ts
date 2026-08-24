import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const composable = source(join(process.cwd(), "app/composables/useAdminAuditLogs.ts"));
const page = source(join(process.cwd(), "app/pages/admin/audit-logs.vue"));
const adminLayout = source(join(process.cwd(), "app/layouts/admin.vue"));

describe("audit trail frontend contract", () => {
  it("uses the protected audit endpoints", () => {
    expect(composable).toContain('"/api/admin-management/audit-logs"');
    expect(composable).toContain('"/api/admin-management/audit-summary"');
    expect(composable).toContain('"/api/admin-management/audit-integrity"');
  });

  it("keeps all audit event classifications visible", () => {
    for (const category of [
      "Administrative",
      "Security",
      "Configuration",
      "Transaction",
      "Privacy",
      "System",
    ]) {
      expect(composable).toContain(`"${category}"`);
      expect(page).toContain(category);
    }
  });

  it("shows integrity, outcome, severity, and before/after evidence", () => {
    expect(page).toContain("Audit Integrity");
    expect(page).toContain("Verify Integrity");
    expect(page).toContain("detail.before");
    expect(page).toContain("detail.after");
    expect(page).toContain("detail.recordHash");
    expect(page).toContain("Denied");
    expect(page).toContain("Critical");
  });

  it("keeps the audit trail in Administrator navigation", () => {
    expect(adminLayout).toContain('to: "/admin/audit-logs"');
    expect(adminLayout).toContain('label: "Audit Trail"');
  });
});
