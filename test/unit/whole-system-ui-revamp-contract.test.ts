import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (relativePath: string) => source(resolve(process.cwd(), relativePath));

describe("whole-system UI revamp contract", () => {
  it("keeps shared product primitives available", () => {
    for (const file of [
      "app/components/shared/AppPageHeader.vue",
      "app/components/shared/AppSectionHeader.vue",
      "app/components/shared/AppMetricCard.vue",
      "app/components/shared/AppEmptyState.vue",
      "app/components/shared/AppFilterPanel.vue",
    ]) {
      expect(read(file).length).toBeGreaterThan(100);
    }
  });

  it("uses the unified portal frame and navigation treatment", () => {
    for (const portal of ["admin", "librarian", "student", "faculty"]) {
      const layout = read(`app/layouts/${portal}.vue`);
      expect(layout).toContain("sncbt-portal-frame");
      expect(layout).toContain("sncbt-portal-view");
    }

    for (const portal of ["admin", "student", "faculty"]) {
      expect(read(`app/layouts/${portal}.vue`)).toContain("sncbt-navigation");
    }
  });

  it("keeps the redesigned sign-in experience with light/dark support", () => {
    const signIn = read("app/pages/index.vue");
    expect(signIn).toContain("relative min-h-screen overflow-hidden");
    expect(signIn).toContain("bg-[#eef6f2]");
    expect(signIn).toContain("dark:bg-[#020c12]");
    expect(signIn).toContain("Library Management System");
    expect(signIn).not.toContain("Open Student Registration");
    expect(signIn).toContain('id="signin-heading"');
    expect(signIn).toContain("Sign in");
    expect(signIn).toContain("Switch to light mode");
    expect(signIn).toContain("Switch to dark mode");
  });

  it("normalizes core Librarian workflows onto the shared page shell and header", () => {
    for (const file of [
      "books/index.vue",
      "books/register.vue",
      "books/import.vue",
      "books/copies.vue",
      "borrow.vue",
      "return.vue",
      "reservations.vue",
      "students.vue",
      "faculty.vue",
      "fines.vue",
      "visits.vue",
      "notifications.vue",
      "reports.vue",
      "membership-term.vue",
      "memberships.vue",
    ]) {
      const page = read(`app/pages/librarian/${file}`);
      expect(page).toContain("sncbt-page-shell");
      expect(page).toContain("LibrarianPageHeader");
    }
  });

  it("documents semantic color, responsive, form, table and messaging rules", () => {
    const guide = read("docs/PRODUCT_DESIGN_GUIDE.md");
    for (const heading of [
      "## Design philosophy",
      "## Tables and data-heavy screens",
      "## Forms",
      "## Responsive behavior",
      "## Interaction philosophy",
      "## Human-friendly messages",
    ]) {
      expect(guide).toContain(heading);
    }
  });
});
