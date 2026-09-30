import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Phase 6 Faculty portal finalization", () => {
  it("connects dashboard metrics and notices to targeted Faculty workflows", () => {
    const source = read("app/pages/faculty/dashboard.vue");
    expect(source).toContain("/faculty/borrowings?attention=due-soon");
    expect(source).toContain("/faculty/borrowings?attention=lost");
    expect(source).toContain("/faculty/reports?status=open");
    expect(source).toContain("Faculty action center");
    expect(source).toContain("i-lucide-list-todo");
  });

  it("keeps Faculty borrowing attention filters deep-linkable and accessible", () => {
    const source = read("app/pages/faculty/borrowings.vue");
    expect(source).toContain('queryChoice("attention"');
    expect(source).toContain('aria-label="Borrowing attention filter"');
    expect(source).toContain('aria-label="Search Faculty borrowing records"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("View book details for");
    expect((source.match(/portal\.summary\.value\.currentCount/g) ?? []).length).toBe(1);
  });

  it("preserves searchable Faculty report filters in the URL", () => {
    const source = read("app/pages/faculty/reports.vue");
    expect(source).toContain('queryChoice("status"');
    expect(source).toContain('{ label: "Open Review", value: "open" }');
    expect(source).toContain("syncRouteQuery");
    expect(source).toContain('aria-label="Search Faculty book status reports"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("View book details for");
  });

  it("keeps the Faculty catalog filter state accessible and deep-linkable", () => {
    const source = read("app/pages/faculty/books/index.vue");
    expect(source).toContain('queryText("search"');
    expect(source).toContain("syncRouteQuery");
    expect(source).toContain('aria-label="Search Faculty book collection"');
    expect(source).toContain('aria-live="polite"');
  });
});
