import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("remaining typecheck compatibility contract", () => {
  it("keeps browser timers and strict indexed reads type-safe", () => {
    expect(read("app/composables/useAuth.ts")).toContain("BodyInit | Record<string, unknown>");
    expect(read("app/composables/useLibraryReportExport.ts")).toContain("if (!table) continue;");
    expect(read("app/pages/admin/settings.vue")).toContain("sectionItems[0]!");
    expect(read("app/layouts/librarian.vue")).toContain("contentNavigationLinks");
    expect(read("app/composables/useLibraryInventoryExcel.ts")).toContain('as Cell["value"]');

    for (const file of [
      "app/composables/useLibraryNotifications.ts",
      "app/composables/useStudentNotifications.ts",
      "app/pages/librarian/notifications.vue",
      "app/pages/student/notifications.vue",
    ]) {
      expect(read(file)).toMatch(/let (?:pollingTimer|liveRefreshTimer|refreshTimer): number \| null = null;/);
    }
  });
});
