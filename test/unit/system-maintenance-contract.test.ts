import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("system maintenance contract", () => {
  it("shows maintenance status in every operational portal layout", () => {
    for (const portal of ["librarian", "student", "faculty"]) {
      expect(read(`app/layouts/${portal}.vue`)).toContain("<SystemMaintenanceBanner />");
    }
    expect(read("app/layouts/admin.vue")).toContain("<SystemMaintenanceBanner admin />");
  });

  it("does not reintroduce session touch requests", () => {
    const monitoring = `${read("app/composables/usePortalMonitoring.ts")}\n${read("app/composables/useStudentSession.ts")}`;
    expect(monitoring).not.toContain("/session/touch");
  });

  it("short-circuits non-admin mutations in maintenance mode", () => {
    const source = read("app/composables/useAuth.ts");
    expect(source).toContain("SYSTEM_MAINTENANCE_READ_ONLY");
    expect(source).toContain("maintenance.enabled.value");
  });
});
