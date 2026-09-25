import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("Administrator Data Management contract", () => {
  const page = read("app/pages/admin/data-management.vue");
  const composable = read("app/composables/useAdminDataManagement.ts");
  const archive = read("app/pages/admin/archive.vue");
  const layout = read("app/layouts/admin.vue");

  it("keeps Data Management in Administrator navigation and route metadata", () => {
    expect(layout).toContain('label: "Manage Data"');
    expect(layout).toContain('label: "Archive"');
    expect(layout).toContain('to: "/admin/data-management"');
    expect(page).toContain('title: "Data Management"');
  });

  it("uses archive-first lifecycle with separate protected records", () => {
    expect(page).toContain('label="Managed Records"');
    expect(page).toContain("openCreate");
    expect(page).toContain("saveCreate");
    expect(page).toContain('label: "View Record"');
    expect(page).toContain('label="Specialized Records"');
    expect(page).toContain('title="Archive this record?"');
    expect(page).toContain('title="Restore this record?"');
    expect(page).toContain('Open Existing Manager');
  });

  it("requires dependency preview and explicit confirmation before permanent deletion", () => {
    expect(archive).toContain("impact.dependencies");
    expect(archive).toContain("impact.confirmationPhrase");
    expect(archive).toContain("deleteReady");
    expect(archive).toContain("Delete Permanently");
    expect(composable).toContain('method: "POST"');
    expect(composable).toContain("/deletion-impact");
    expect(composable).toContain("/delete-permanently");
  });

  it("retains responsive staff presentation", () => {
    expect(page).toContain("AppResponsiveDataView");
    expect(page).toContain("AppRecordCard");
    expect(page).toContain("AppDialogFrame");
    expect(page).toContain("AppStatusBadge");
  });
});
