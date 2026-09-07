import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Student registration no longer imports hardcoded education master data", () => {
  const page = source("app/pages/student-registration.vue");
  expect(page.includes("STUDENT_EDUCATIONAL_LEVELS")).toBe(false);
  expect(page.includes("  programsForLevel,")).toBe(false);
  expect(page.includes("  yearLevelsFor,")).toBe(false);
});

test("Librarian Student management no longer imports hardcoded education master data", () => {
  const page = source("app/pages/librarian/students.vue");
  expect(page.includes("STUDENT_EDUCATIONAL_LEVELS")).toBe(false);
  expect(page.includes("  programsForLevel,")).toBe(false);
  expect(page.includes("  yearLevelsFor,")).toBe(false);
});

test("studentPrograms keeps display helpers but not institution-maintained option arrays", () => {
  const constants = source("app/constants/studentPrograms.ts");
  expect(constants.includes("STUDENT_PROGRAM_OPTIONS")).toBe(false);
  expect(constants.includes("STUDENT_EDUCATIONAL_LEVELS")).toBe(false);
  expect(constants.includes("export function yearGradeLabel")).toBe(true);
});

test("reference-data helpers filter programs and year levels by stable codes", async () => {
  const module = await import("../../app/composables/useReferenceData.ts");
  const payload = module.normalizeReferenceDataPayload({
    academicPrograms: [
      { documentId: "1", code: "BSIT", name: "BS Information Technology", shortName: "BSIT", educationalLevelCode: "COLLEGE", active: true, sortOrder: 1 },
      { documentId: "2", code: "STEM", name: "STEM", shortName: null, educationalLevelCode: "SHS", active: true, sortOrder: 2 },
      { documentId: "3", code: "OLD", name: "Old Program", shortName: null, educationalLevelCode: "COLLEGE", active: false, sortOrder: 3 },
    ],
    programYearLevels: [
      { documentId: "4", code: "BSIT_Y1", name: "1st Year", label: "1st Year", value: 1, programCode: "BSIT", active: true, sortOrder: 1 },
      { documentId: "5", code: "STEM_G11", name: "Grade 11", label: "Grade 11", value: 11, programCode: "STEM", active: true, sortOrder: 1 },
    ],
  });

  expect(
    module.programsForEducationalLevel(payload, "COLLEGE").map((item) => item.code),
  ).toEqual(["BSIT"]);
  expect(
    module.yearLevelsForAcademicProgram(payload, "BSIT").map((item) => item.code),
  ).toEqual(["BSIT_Y1"]);
});

test("staff forms use operational reference data instead of hardcoded institution lists", () => {
  const facultyPage = source("app/pages/librarian/faculty.vue");
  const librarianCreate = source("app/pages/admin/librarians/create.vue");
  const adminUsers = source("app/pages/admin/users/index.vue");
  const members = source("app/composables/useLibraryMembers.ts");
  const librarians = source("app/composables/useAdminLibrarians.ts");
  const users = source("app/composables/useAdminUsers.ts");

  expect(facultyPage.includes("const departmentItems = [")).toBe(false);
  expect(facultyPage.includes("const employmentTypeItems")).toBe(false);
  expect(facultyPage.includes("otherDepartment")).toBe(false);
  expect(facultyPage.includes("facultyDepartments")).toBe(true);
  expect(facultyPage.includes("facultyEmploymentTypes")).toBe(true);
  expect(members.includes("departmentCode: string")).toBe(true);
  expect(members.includes("employmentTypeCode: string")).toBe(true);

  expect(librarianCreate.includes("const positionItems = [")).toBe(false);
  expect(librarianCreate.includes("librarianPositions")).toBe(true);
  expect(librarians.includes("positionCode: string")).toBe(true);

  expect(adminUsers.includes("const facultyEmploymentOptions = [")).toBe(false);
  expect(adminUsers.includes("facultyDepartments")).toBe(true);
  expect(adminUsers.includes("facultyEmploymentTypes")).toBe(true);
  expect(users.includes("departmentCode?: string")).toBe(true);
  expect(users.includes("employmentTypeCode?: string")).toBe(true);
});

test("Book forms separate dynamic Book Category and Shelf Location selections", () => {
  const register = source("app/pages/librarian/books/register.vue");
  const edit = source("app/pages/librarian/books/[id]/edit.vue");
  const index = source("app/pages/librarian/books/index.vue");

  expect(register.includes("const shelfLocations = [")).toBe(false);
  expect(register.includes("bookCategories")).toBe(true);
  expect(register.includes("shelfLocations")).toBe(true);
  expect(register.includes("categoryCode")).toBe(true);
  expect(register.includes("shelfLocationCode")).toBe(true);
  expect(register.includes("category_code")).toBe(true);
  expect(register.includes("shelf_location_code")).toBe(true);

  expect(edit.includes("const shelfLocations = [")).toBe(false);
  expect(edit.includes("bookCategories")).toBe(true);
  expect(edit.includes("shelfLocations")).toBe(true);
  expect(edit.includes("categoryCode")).toBe(true);
  expect(edit.includes("shelfLocationCode")).toBe(true);

  expect(index.includes("const shelfLocationItems = [")).toBe(false);
  expect(index.includes("shelfLocations")).toBe(true);
});


test("Excel inventory template and parser use dynamic Book Category and Shelf Location reference data", () => {
  const excel = source("app/composables/useLibraryInventoryExcel.ts");
  expect(excel.includes("export const INVENTORY_SHELF_LOCATIONS = [")).toBe(false);
  expect(excel.includes('"Book Category"')).toBe(true);
  expect(excel.includes('"Shelf Location"')).toBe(true);
  expect(excel.includes("useReferenceData()")).toBe(true);
  expect(excel.includes("category_code")).toBe(true);
  expect(excel.includes("shelf_location_code")).toBe(true);
  expect(excel.includes("category: string")).toBe(true);
});

test("Inventory import preview shows Book Category separately from Shelf Location", () => {
  const page = source("app/pages/librarian/books/import.vue");
  expect(page.includes(">Book Category</th>")).toBe(true);
  expect(page.includes("{{ row.category }}")).toBe(true);
});

test("Student and Faculty catalog filters submit stable Book Category codes", () => {
  const studentBooks = source("app/composables/useStudentBooks.ts");
  const studentPage = source("app/pages/student/books/index.vue");
  const facultyPortal = source("app/composables/useFacultyPortal.ts");
  const facultyPage = source("app/pages/faculty/books/index.vue");

  expect(studentBooks.includes("categoryOptions")).toBe(true);
  expect(studentPage.includes("collection.categoryOptions.value")).toBe(true);
  expect(studentPage.includes("value: item.code")).toBe(true);

  expect(facultyPortal.includes("categoryOptions")).toBe(true);
  expect(facultyPage.includes("portal.categoryOptions.value")).toBe(true);
  expect(facultyPage.includes("value: item.code")).toBe(true);
});

test("Academic Term screens use reference data instead of hardcoded semester choices", () => {
  const librarySettings = source("app/composables/useLibrarySettings.ts");
  const adminSettings = source("app/composables/useAdminSettings.ts");
  const membershipTerm = source("app/composables/useMembershipTerm.ts");
  const libraryMembers = source("app/composables/useLibraryMembers.ts");
  const adminPage = source("app/pages/admin/settings.vue");
  const termPage = source("app/pages/librarian/membership-term.vue");
  const membershipsPage = source("app/pages/librarian/memberships.vue");
  const libraryCard = source("app/pages/student/library-card.vue");

  expect(librarySettings.includes("currentSemester: string")).toBe(true);
  expect(librarySettings.includes("currentAcademicTerm")).toBe(true);
  expect(adminSettings.includes("currentSemester: string")).toBe(true);
  expect(membershipTerm.includes("semester: string")).toBe(true);
  expect(membershipTerm.includes("academicTermCode")).toBe(true);
  expect(libraryMembers).toMatch(/interface MembershipRecord[\s\S]*?semester:\s*string;/);

  expect(adminPage.includes("const semesterItems = [")).toBe(false);
  expect(adminPage.includes("academicTerms")).toBe(true);
  expect(termPage.includes("const semesterItems = [")).toBe(false);
  expect(termPage.includes("academicTerms")).toBe(true);
  expect(termPage.includes("academicTermCode")).toBe(true);
  expect(membershipsPage.includes("function currentSemester()")).toBe(false);
  expect(membershipsPage.includes("function currentAcademicYear()")).toBe(false);
  expect(membershipsPage.includes("const semesterItems = [")).toBe(false);
  expect(membershipsPage.includes("academicSemesters")).toBe(true);
  expect(membershipsPage.includes("academicTermCode")).toBe(true);
  expect(libraryCard.includes('source.semester ===\n      "Second Semester"')).toBe(false);
  expect(libraryCard.includes('source.semester === "Summer"')).toBe(false);
  expect(libraryCard.includes("librarySettings.settings.value.general.currentSemester")).toBe(true);
  expect(libraryCard.includes('?? "Not recorded"')).toBe(true);
});
