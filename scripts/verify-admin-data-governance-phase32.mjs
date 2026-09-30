import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`Phase 3.2 Admin governance verification FAILED: ${message}`);
    process.exit(1);
  }
};

const page = read("app/pages/admin/data-management.vue");
const archive = read("app/pages/admin/archive.vue");
const composable = read("app/composables/useAdminDataManagement.ts");

assert(page.includes("Protected System Records"), "protected-system wording is missing.");
assert(page.includes("archive-first workspace"), "archive-first Admin description is missing.");
assert(page.includes("opens that workflow"), "dedicated-editor handoff guidance is missing.");
assert(archive.includes("impact.blockers"), "Archive does not display deletion safeguards/blockers.");
assert(archive.includes("Delete Permanently"), "Archive permanent delete action is missing.");
for (const group of ["People", "Operations", "Security"]) {
  assert(composable.includes(`\\"${group}\\"`) || composable.includes(`"${group}"`), `managed-domain group ${group} is missing from frontend types.`);
}
console.log("Phase 3.2 Administrator governance frontend verification passed.");
