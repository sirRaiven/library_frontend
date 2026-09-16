import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Phase 26-34 authenticated read-only acceptance gate", () => {
  it("provides a fail-fast authenticated read-only command without enabling writes", () => {
    const pkg = JSON.parse(read("package.json"));
    const runner = read("scripts/run-library-acceptance.mjs");

    expect(pkg.scripts["test:acceptance:authenticated"]).toBe("npm run test:acceptance:authenticated:local");
    expect(pkg.scripts["test:acceptance:authenticated:local"]).toContain("--scope=authenticated-readonly");
    expect(runner).toContain('scope === "authenticated-readonly"');
    expect(runner).toContain('childBaseEnv.E2E_ALLOW_WRITES = "false"');
    expect(runner).toContain("Authenticated read-only acceptance is not configured completely.");
  });

  it("requires all role credentials and dynamic route fixtures for complete read-only route execution", () => {
    const runner = read("scripts/run-library-acceptance.mjs");
    for (const key of [
      "E2E_ADMIN_USERNAME", "E2E_ADMIN_PASSWORD",
      "E2E_LIBRARIAN_USERNAME", "E2E_LIBRARIAN_PASSWORD",
      "E2E_STUDENT_USERNAME", "E2E_STUDENT_PASSWORD",
      "E2E_FACULTY_USERNAME", "E2E_FACULTY_PASSWORD",
      "E2E_BOOK_DOCUMENT_ID", "E2E_BOOK_ID", "E2E_ADMIN_USER_ID", "E2E_ADMIN_ROLE_ID",
    ]) {
      expect(runner).toContain(`"${key}"`);
    }
  });
});
