import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (relativePath: string) => source(resolve(process.cwd(), relativePath));

const rendered = [
  "app/pages/student/dashboard.vue",
  "app/pages/student/books/index.vue",
  "app/pages/student/books/[documentId].vue",
  "app/pages/student/borrowings.vue",
  "app/pages/student/reservations.vue",
  "app/pages/student/history.vue",
  "app/pages/student/library-card.vue",
  "app/pages/student/notifications.vue",
  "app/pages/student/security.vue",
  "app/pages/faculty/dashboard.vue",
  "app/pages/faculty/books/index.vue",
  "app/pages/faculty/books/[documentId].vue",
  "app/pages/faculty/borrowings.vue",
  "app/pages/faculty/reports.vue",
  "app/pages/faculty/profile.vue",
];

describe("DS-5 Student and Faculty member experience contract", () => {
  it("covers every rendered Student and Faculty page", () => {
    for (const file of rendered) {
      expect(read(file)).toContain("sncbt-member-page");
      expect(read(file)).not.toContain("mb-12");
    }
  });

  it("uses progressive filters on search-heavy member pages", () => {
    for (const file of [
      "app/pages/student/books/index.vue",
      "app/pages/student/borrowings.vue",
      "app/pages/student/history.vue",
      "app/pages/student/notifications.vue",
      "app/pages/faculty/books/index.vue",
      "app/pages/faculty/borrowings.vue",
      "app/pages/faculty/reports.vue",
    ]) {
      expect(read(file)).toContain("<AppFilterBar");
      expect(read(file)).toContain('import AppFilterBar from "~/components/shared/AppFilterBar.vue";');
    }
  });

  it("keeps book browsing compact on phones without removing detail routes", () => {
    const card = read("app/components/shared/PortalBookCard.vue");
    expect(card).toContain("hidden shrink-0");
    expect(card).toContain("sm:w-40");
    expect(card).toContain("View details");

    expect(read("app/pages/student/books/[documentId].vue")).toContain("min-h-[15rem]");
    expect(read("app/pages/faculty/books/[documentId].vue")).toContain("min-h-[15rem]");
  });

  it("reduces redundant member-facing information", () => {
    const card = read("app/pages/student/library-card.vue");
    expect(card).toContain('v-if="libraryCard.card.value.renewal.required"');
    expect(card).not.toContain("Changes saved by the Librarian in");

    const faculty = read("app/pages/faculty/profile.vue");
    expect(faculty).not.toContain("Account security page will follow");
  });

  it("keeps mobile shell clearance and protected actions intact", () => {
    for (const layout of ["student", "faculty"]) {
      const source = read(`app/layouts/${layout}.vue`);
      expect(source).toContain("sncbt-mobile-nav-scrollport");
      expect(source).toContain("sncbt-mobile-bottom-nav-spacer");
    }

    expect(read("app/pages/student/reservations.vue")).toContain("createReservations");
    expect(read("app/pages/student/security.vue")).toContain("submitPasswordChange");
    expect(read("app/pages/faculty/borrowings.vue")).toContain("submitReport");
    expect(read("app/pages/faculty/profile.vue")).toContain("Save Changes");
  });
});
