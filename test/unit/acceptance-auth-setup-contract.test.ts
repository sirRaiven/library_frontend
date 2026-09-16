import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("authenticated acceptance setup helper contract", () => {
  it("ships the local read-only credential/fixture setup helper", () => {
    expect(existsSync(resolve(root, "scripts/setup-library-acceptance-auth.mjs"))).toBe(true);
    expect(existsSync(resolve(root, "test/node/setup-library-acceptance-auth.test.mjs"))).toBe(true);

    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["setup:acceptance:authenticated"]).toContain("setup-library-acceptance-auth.mjs");
    expect(pkg.scripts["verify:acceptance:setup-helper"]).toContain("node --test");
  });

  it("keeps setup non-mutating and auto-discovers the four read-only route fixtures", () => {
    const script = read("scripts/setup-library-acceptance-auth.mjs");
    expect(script).toContain('E2E_ALLOW_WRITES: "false"');
    expect(script).toContain("E2E_BOOK_DOCUMENT_ID");
    expect(script).toContain("E2E_BOOK_ID");
    expect(script).toContain("E2E_ADMIN_USER_ID");
    expect(script).toContain("E2E_ADMIN_ROLE_ID");
    expect(script).not.toContain("E2E_STUDENT_BARCODE:");
    expect(script).not.toContain("E2E_AVAILABLE_BOOK_BARCODE:");
  });
});
