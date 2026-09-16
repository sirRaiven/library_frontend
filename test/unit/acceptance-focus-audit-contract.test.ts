import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Phase 26-34 interactive-control audit correction", () => {
  it("checks keyboard reachability without forcing framework controls to own document.activeElement", () => {
    const audit = read("test/acceptance/helpers/ui-audit.ts");

    expect(audit).toContain("keyboardIssues");
    expect(audit).toContain("element.tabIndex");
    expect(audit).toContain('element.closest("[inert]")');
    expect(audit).toContain("hiddenFromAssistiveTechnology");
    expect(audit).not.toContain("await control.focus()");
    expect(audit).not.toContain("document.activeElement === element");
  });
});
