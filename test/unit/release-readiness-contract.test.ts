import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const projectPath = (relativePath: string): string => resolve(process.cwd(), relativePath);
const readProjectFile = (relativePath: string): string => source(projectPath(relativePath));

describe("release readiness contract", () => {
  it("keeps the streamlined Admin surface", async () => {
    await expect(access(projectPath("app/pages/admin/privacy-retention.vue"))).rejects.toBeDefined();
    await expect(access(projectPath("app/pages/admin/security-alerts.vue"))).rejects.toBeDefined();
    const reports = readProjectFile("app/pages/admin/reports.vue");
    expect(reports).toContain("Monitoring Reports");
  });

  it("keeps maintenance and audit administration available", async () => {
    await expect(access(projectPath("app/pages/admin/system-health.vue"))).resolves.toBeUndefined();
    await expect(access(projectPath("app/pages/admin/audit-logs.vue"))).resolves.toBeUndefined();
  });
});
