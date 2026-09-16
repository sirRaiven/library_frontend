import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Phase 26-34 acceptance runtime remediation", () => {
  it("waits for Nuxt hydration before browser interaction", () => {
    const harness = read("test/acceptance/helpers/harness.ts");
    expect(harness).toContain("waitForNuxtHydration");
    expect(harness).toContain("useNuxtApp().isHydrating === false");
    expect(harness).toContain("goto(page: Page, path: string)");

    for (const file of [
      "auth-public.acceptance.test.ts",
      "responsive.acceptance.test.ts",
      "student.acceptance.test.ts",
      "librarian.acceptance.test.ts",
      "faculty.acceptance.test.ts",
      "admin.acceptance.test.ts",
      "role-routes.acceptance.test.ts",
      "error-states.acceptance.test.ts",
      "write-workflows.acceptance.test.ts",
    ]) {
      const source = read(`test/acceptance/${file}`);
      expect(source, file).not.toContain("page.goto(");
    }
  });

  it("rejects unauthenticated protected hard-loads before portal hydration", () => {
    const middleware = read("app/middleware/auth.global.ts");
    expect(middleware).toContain('useCookie<string | null>("auth-session-hint")');
    expect(middleware).toContain('to.path === "/faculty-access"');
    expect(middleware).toContain('navigateTo("/faculty/dashboard", { replace: true })');
    expect(middleware).toContain("query: { redirect: to.fullPath }");
  });

  it("restores auth before role portal mounted services and guards notification polling", () => {
    for (const role of ["admin", "faculty", "librarian", "student"]) {
      expect(read(`app/layouts/${role}.vue`), role).toContain("await auth.initialize();");
    }

    expect(read("app/composables/useLibraryNotifications.ts")).toContain(
      "!import.meta.client || !auth.isLibrarian.value",
    );
    expect(read("app/composables/useStudentNotifications.ts")).toContain(
      "!import.meta.client || !auth.isStudent.value",
    );
  });
});
