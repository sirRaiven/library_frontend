import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("Administrator Data Governance Phase 3.2", () => {
  const data = read("app/pages/admin/data-management.vue");
  const archive = read("app/pages/admin/archive.vue");
  const composable = read("app/composables/useAdminDataManagement.ts");

  it("presents protected system records separately from managed business data", () => {
    expect(data).toContain("Protected System Records");
    expect(data).toContain("immutable audit evidence");
  });

  it("keeps specialized editors while centralizing archive governance", () => {
    expect(data).toContain("opens that workflow");
    expect(data).toContain("Archive Record");
    expect(data).toContain("Open Existing Manager");
  });

  it("shows blockers in destructive archive confirmation", () => {
    expect(archive).toContain("impact.blockers");
    expect(archive).toContain("blocker.message");
    expect(archive).toContain("deleteReady");
  });

  it("types People, Operations, and Security as managed-domain groups", () => {
    expect(composable).toContain('"People"');
    expect(composable).toContain('"Operations"');
    expect(composable).toContain('"Security"');
  });
});
