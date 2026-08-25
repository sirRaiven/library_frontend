import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Administrator navigation cleanup contract", () => {
  it("uses the simplified Admin sidebar", () => {
    const layout = source("app/layouts/admin.vue");
    for (const label of [
      "Dashboard", "Users", "Librarians", "Account Review", "Roles & Permissions",
      "Library Operations", "Reports", "Library Settings", "Activity Log", "Sessions",
      "Devices", "Audit Trail", "System & Maintenance",
    ]) expect(layout).toContain(`label: "${label}"`);
  });

  it("removes Privacy & Retention from the frontend", () => {
    expect(existsSync(resolve(process.cwd(), "app/pages/admin/privacy-retention.vue"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "app/composables/useAdminPrivacy.ts"))).toBe(false);
    expect(source("app/layouts/admin.vue")).not.toContain("Privacy & Retention");
  });
});
