import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const page = read("app/pages/librarian/students/[identifier]/record.vue");
const composable = read("app/composables/useLibrarianStudentRecord.ts");

const requirements = [
  [page.includes("Term-based Library access. This is separate from the permanent Library card status."), "membership/card distinction"],
  [page.includes("No term membership is linked"), "missing membership explanation"],
  [page.includes("membershipTermLabel(student)"), "academic term display helper"],
  [page.includes("Library card status"), "explicit card status label"],
  [composable.includes("academicTerm:"), "academic-term response typing"],
];

const failed = requirements.filter(([ok]) => !ok).map(([, label]) => label);
if (failed.length) {
  console.error(`Student Record membership verification failed: ${failed.join(", ")}`);
  process.exit(1);
}

console.log("Student Record membership verification passed.");
