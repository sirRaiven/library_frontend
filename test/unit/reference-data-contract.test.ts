import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const DIRECT_OPTION_PAGES = [
  "app/pages/student-registration.vue",
  "app/pages/librarian/students.vue",
  "app/pages/librarian/faculty.vue",
  "app/pages/admin/users/index.vue",
  "app/pages/admin/librarians/create.vue",
  "app/pages/librarian/books/index.vue",
  "app/pages/librarian/books/register.vue",
  "app/pages/librarian/books/[id]/edit.vue",
  "app/pages/student/books/index.vue",
  "app/pages/faculty/books/index.vue",
  "app/pages/admin/settings.vue",
  "app/pages/librarian/membership-term.vue",
  "app/pages/librarian/memberships.vue",
  "app/pages/librarian/reports.vue",
  "app/pages/admin/reports.vue",
];

test("final frontend has one option-registry composable and no legacy reference-data composable", () => {
  expect(existsSync(resolve(process.cwd(), "app/composables/useReferenceData.ts"))).toBe(false);
  const options = source("app/composables/useLibraryOptions.ts");
  expect(options).toContain("studentPrograms");
  expect(options).toContain("facultyDepartments");
  expect(options).toContain("facultyEmploymentTypes");
  expect(options).toContain("librarianPositions");
  expect(options).toContain("bookCategories");
  expect(options).toContain("shelfLocations");
  expect(options).toContain("semesters");
  expect(options).toContain("academicTerms");
  expect(options).toContain("currentAcademicTerm");
  expect(options).toContain("programsForEducationalLevel");
  expect(options).toContain("yearLevelsForEducationalLevel");
  expect(options).toContain("withHistoricalValue");
});

test("all direct dropdown consumers use the final library option registry", () => {
  for (const file of DIRECT_OPTION_PAGES) {
    const page = source(file);
    expect(page, file).toContain("useLibraryOptions()");
    expect(page, file).not.toContain("useReferenceData()");
  }
});

test("student education choices use structural level/year logic and registry programs", () => {
  for (const file of [
    "app/pages/student-registration.vue",
    "app/pages/librarian/students.vue",
  ]) {
    const page = source(file);
    expect(page).toContain("programsForEducationalLevel");
    expect(page).toContain("yearLevelsForEducationalLevel");
    expect(page).not.toContain("yearLevelsForProgram");
  }
});

test("staff and librarian forms use final extensible registry values", () => {
  const faculty = source("app/pages/librarian/faculty.vue");
  const users = source("app/pages/admin/users/index.vue");
  const librarians = source("app/pages/admin/librarians/create.vue");
  expect(faculty).toContain("libraryOptions.facultyDepartments.value");
  expect(faculty).toContain("libraryOptions.facultyEmploymentTypes.value");
  expect(faculty).toContain("withHistoricalValue");
  expect(users).toContain("libraryOptions.facultyDepartments.value");
  expect(users).toContain("libraryOptions.facultyEmploymentTypes.value");
  expect(librarians).toContain("libraryOptions.librarianPositions.value");
});

test("admin reports consume final semesters and academic-term metadata", () => {
  const reports = source("app/pages/admin/reports.vue");
  expect(reports).toContain("libraryOptions.semesters.value");
  expect(reports).toContain("libraryOptions.academicTerms");
  expect(reports).toContain("libraryOptions.currentAcademicTerm.value");
  expect(reports).not.toContain("academicSemesters");
});

test("book Excel workflow uses final independent category and shelf registries", () => {
  const excel = source("app/composables/useLibraryInventoryExcel.ts");
  expect(excel).toContain("useLibraryOptions()");
  expect(excel).toContain("libraryOptions.bookCategories.value");
  expect(excel).toContain("libraryOptions.shelfLocations.value");
  expect(excel).toContain('"Book Category"');
  expect(excel).toContain('"Shelf Location"');
});

test("final frontend contains no retired relation identifiers", () => {
  const files = DIRECT_OPTION_PAGES.concat([
    "app/composables/useLibraryOptions.ts",
    "app/composables/useMembershipTerm.ts",
    "app/composables/useLibraryInventoryExcel.ts",
  ]);
  const retired = [
    "academicSemesterCode",
    "educational_level_ref",
    "academic_program",
    "program_year_level",
    "department_ref",
    "employment_type_ref",
    "position_ref",
    "category_ref",
    "shelf_location_ref",
    "academic_semester",
  ];
  for (const file of files) {
    const content = source(file);
    for (const marker of retired) expect(content, `${file}: ${marker}`).not.toContain(marker);
  }
});
