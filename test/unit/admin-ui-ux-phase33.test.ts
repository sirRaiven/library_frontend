import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Administrator Phase 3.3 UI/UX finalization contract", () => {
  it("organizes Administrator navigation around user goals while preserving destinations", () => {
    const layout = read("app/layouts/admin.vue");
    for (const label of [
      "People & Access",
      "Library Administration",
      "Governance & Oversight",
      "System & Security",
      "Dashboard",
      "Users",
      "Librarians",
      "Account Review",
      "Roles & Permissions",
      "Library Operations",
      "Data Management",
      "Library Settings",
      "Reports",
      "Audit Trail",
      "Archive",
      "Activity Log",
      "Sessions",
      "Devices",
      "System & Maintenance",
    ]) expect(layout).toContain(label);
  });

  it("makes the dashboard action-oriented instead of inventory-heavy", () => {
    const dashboard = read("app/pages/admin/dashboard.vue");
    for (const label of ["Priority Summary", "Quick Actions", "Needs Attention", "Recent Administrative Activity"]) {
      expect(dashboard).toContain(label);
    }
    expect(dashboard).not.toContain('label: "Registered Students"');
    expect(dashboard).not.toContain('label: "Registered Faculty"');
    expect(dashboard).not.toContain('label: "Book Copies"');
  });

  it("standardizes empty states and keyboard-accessible shortcuts", () => {
    expect(read("app/components/admin/AdminEmptyState.vue")).toContain('role="status"');
    expect(read("app/components/admin/AdminQuickAction.vue")).toContain("focus-visible:ring-2");
    expect(read("app/pages/admin/users/index.vue")).toContain("<AdminEmptyState");
    expect(read("app/pages/admin/librarians/index.vue")).toContain("<AdminEmptyState");
    expect(read("app/pages/admin/archive.vue")).toContain("<AdminEmptyState");
  });

  it("standardizes security and destructive action dialogs", () => {
    for (const page of ["app/pages/admin/sessions.vue", "app/pages/admin/devices.vue"]) {
      const source = read(page);
      expect(source).toContain("<AppDialogFrame");
      expect(source).toContain("Administrative reason");
      expect(source).toContain("#actions");
    }
    const users = read("app/pages/admin/users/index.vue");
    expect(users).toContain("<AppDialogFrame");
    expect(users).not.toContain('aria-label="Open account details"');
  });

  it("gives top-level Administrator filters explicit accessible names", () => {
    expect(read("app/pages/admin/users/index.vue")).toContain('aria-label="Filter users by role"');
    expect(read("app/pages/admin/activity.vue")).toContain('aria-label="Filter activity by category"');
    expect(read("app/pages/admin/sessions.vue")).toContain('aria-label="Filter sessions by source"');
    expect(read("app/pages/admin/devices.vue")).toContain('aria-label="Filter devices by trust status"');
    expect(read("app/pages/admin/audit-logs.vue")).toContain('aria-label="Filter Audit Trail by category"');
  });
});
