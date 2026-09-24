import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { source } from "../helpers/source-files";

const projectFile = (relativePath: string) => source(resolve(process.cwd(), relativePath));

describe("librarian UI consistency contract", () => {
  it("keeps the dashboard canvas on authenticated scroll containers and mobile-nav clearance where required", () => {
    for (const layout of ["admin", "student", "faculty", "librarian"]) {
      const content = projectFile(`app/layouts/${layout}.vue`);
      expect(content).toContain("sncbt-dashboard-canvas");
      expect(content).toContain("bg-[var(--sncbt-canvas)]");
    }

    for (const layout of ["student", "faculty"]) {
      const content = projectFile(`app/layouts/${layout}.vue`);
      expect(content).toContain("sncbt-mobile-nav-scrollport");
      expect(content).toContain("sncbt-mobile-bottom-nav-spacer");
    }
  });

  it("uses the shared Librarian metric treatment on summary-heavy pages", () => {
    for (const page of [
      "students.vue",
      "faculty.vue",
      "memberships.vue",
      "notifications.vue",
      "visits.vue",
      "faculty-book-reports.vue",
      "fines.vue",
    ]) {
      expect(projectFile(`app/pages/librarian/${page}`)).toContain("<LibrarianMetricCard");
    }
  });

  it("keeps the book edit workflow on the shared Librarian page header", () => {
    const content = projectFile("app/pages/librarian/books/[id]/edit.vue");
    expect(content).toContain("<LibrarianPageHeader");
    expect(content).toContain('title="Edit Book Information"');
  });

  it("provides a Librarian-specific metric wrapper over the shared design system", () => {
    const content = projectFile("app/components/librarian/LibrarianMetricCard.vue");
    expect(content).toContain('import AppMetricCard from "~/components/shared/AppMetricCard.vue"');
    expect(content).toContain("<AppMetricCard");
  });
});
