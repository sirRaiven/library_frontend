import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

describe("Librarian Student Record contract", () => {
  it("adds a dedicated student record route and action from the Students page", () => {
    const page = read("app/pages/librarian/students/[identifier]/record.vue");
    const students = read("app/pages/librarian/students.vue");
    const routes = read("test/acceptance/helpers/routes.ts");

    expect(page).toContain('title="Student Record"');
    expect(page).toContain("summary.totalBorrowings");
    expect(page).toContain("summary.totalReservations");
    expect(page).toContain("summary.totalTimeIns");
    expect(page).toContain("Student Activity");
    expect(students).toContain("/record`");
    expect(students).toContain('View Student Record for ${student.fullName}');
    expect(students).toContain('View Student Record for ${row.original.fullName}');
    expect(students).toContain('<NuxtPage v-if="!isStudentDirectoryRoute" />');
    expect(routes).toContain('/librarian/students/[identifier]/record');
  });

  it("loads the record through the staff-only portal history endpoint", () => {
    const composable = read("app/composables/useLibrarianStudentRecord.ts");

    expect(composable).toContain("/api/portal-history/student-record/");
    expect(composable).toContain("totalTimeIns");
    expect(composable).toContain("category");
    expect(composable).toContain("dateFrom");
    expect(composable).toContain("dateTo");
  });

  it("does not claim visit duration when the source schema records time-in only", () => {
    const page = read("app/pages/librarian/students/[identifier]/record.vue");
    expect(page).toContain("Total time-ins");
    expect(page).toContain("Recorded Library entries");
    expect(page).not.toContain("summary.totalHours");
    expect(page).not.toContain("Time spent");
  });

  it("keeps the Student Record keyboard and screen-reader friendly", () => {
    const page = read("app/pages/librarian/students/[identifier]/record.vue");

    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('aria-atomic="true"');
    expect(page).toContain('aria-labelledby="student-record-profile-heading"');
    expect(page).toContain('aria-labelledby="student-record-summary-heading"');
    expect(page).toContain('aria-labelledby="student-activity-heading"');
    expect(page).toContain('label="Search activity"');
    expect(page).toContain('label="Activity type"');
    expect(page).toContain('label="From date"');
    expect(page).toContain('label="To date"');
    expect(page).toContain('label="Sort order"');
    expect(page).toContain('aria-label="Student activity pages"');
    expect(page).toContain('role="status"');
    expect(page).toContain('aria-hidden="true"');
  });

  it("distinguishes permanent Library card status from term membership data", () => {
    const page = read("app/pages/librarian/students/[identifier]/record.vue");
    const composable = read("app/composables/useLibrarianStudentRecord.ts");

    expect(page).toContain("Term-based Library access. This is separate from the permanent Library card status.");
    expect(page).toContain("No term membership is linked");
    expect(page).toContain("Library card status");
    expect(page).toContain("membershipTermLabel(student)");
    expect(composable).toContain("academicTerm:");
    expect(composable).toContain("enrollmentVerified");
  });
});
