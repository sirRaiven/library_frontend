import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const fail = (message) => {
  console.error(`[librarian-student-record] ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

function walkVue(dir) {
  const files = [];
  for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    const next = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkVue(next));
    else if (entry.isFile() && entry.name.endsWith(".vue")) files.push(next.replaceAll("\\", "/"));
  }
  return files;
}

const detailPath = "app/pages/librarian/students/[identifier]/record.vue";
const composablePath = "app/composables/useLibrarianStudentRecord.ts";
expect(existsSync(resolve(root, detailPath)), "Student Record detail page is missing.");
expect(existsSync(resolve(root, composablePath)), "Student Record composable is missing.");

const pages = walkVue("app/pages");
const librarianPages = pages.filter((file) => file.startsWith("app/pages/librarian/"));
expect(pages.length === 69, `Expected 69 Vue pages, found ${pages.length}.`);
expect(librarianPages.length === 26, `Expected 26 Librarian pages, found ${librarianPages.length}.`);

const detail = read(detailPath);
const composable = read(composablePath);
const students = read("app/pages/librarian/students.vue");
const layout = read("app/layouts/librarian.vue");
const titles = read("app/plugins/dynamic-page-title.ts");
const acceptance = read("test/acceptance/helpers/routes.ts");

for (const token of [
  "Student Record",
  "Total time-ins",
  "Student Activity",
  "summary.totalBorrowings",
  "summary.totalReservations",
  "summary.totalTimeIns",
]) {
  expect(detail.includes(token), `Student Record page is missing ${token}.`);
}

expect(detail.includes("Recorded Library entries"), "Time-in wording must describe entry counts, not duration.");
expect(!detail.includes("summary.totalHours"), "Student Record must not calculate duration without time-out data.");
expect(composable.includes("/api/portal-history/student-record/"), "Student Record API endpoint is not wired.");
expect(students.includes("View Student Record for ${student.fullName}"), "Mobile Student Record action needs a student-specific accessible name.");
expect(students.includes("View Student Record for ${row.original.fullName}"), "Desktop Student Record action needs a student-specific accessible name.");
expect(students.includes("/record`"), "Students page does not link to the Student Record route.");
expect(students.includes('<NuxtPage v-if="!isStudentDirectoryRoute" />'), "Students parent route must render NuxtPage for nested Student Record routes.");
expect(students.includes('v-else class="sncbt-page-shell sncbt-staff-page"'), "Student Directory must render only on the parent /librarian/students route.");
for (const token of [
  'aria-live="polite"',
  'aria-atomic="true"',
  'aria-labelledby="student-record-profile-heading"',
  'aria-labelledby="student-record-summary-heading"',
  'aria-labelledby="student-activity-heading"',
  'label="Search activity"',
  'label="Activity type"',
  'label="From date"',
  'label="To date"',
  'label="Sort order"',
  'aria-label="Student activity pages"',
  'role="status"',
]) {
  expect(detail.includes(token), `Student Record accessibility contract is missing ${token}.`);
}
expect(layout.includes('title: "Student Record"'), "Librarian layout does not identify the Student Record page.");
expect(titles.includes('title: "Student Record"'), "Dynamic page title is missing for Student Record.");
expect(acceptance.includes('/librarian/students/[identifier]/record'), "Acceptance coverage is missing the Student Record route.");

if (!process.exitCode) {
  console.log("Librarian Student Record verification passed.");
  console.log("Page inventory: 69 total Vue pages, including 26 Librarian pages.");
}
