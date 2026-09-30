import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const assert = (condition, message) => {
  if (!condition) {
    console.error(`Admin Data Management frontend verification FAILED: ${message}`);
    process.exit(1);
  }
};

const pageFile = "app/pages/admin/data-management.vue";
const composableFile = "app/composables/useAdminDataManagement.ts";
const archiveFile = "app/pages/admin/archive.vue";
const layoutFile = "app/layouts/admin.vue";
const acceptanceFile = "test/acceptance/helpers/routes.ts";
const dynamicTitleFile = "app/plugins/dynamic-page-title.ts";

for (const file of [pageFile, archiveFile, composableFile, layoutFile, acceptanceFile, dynamicTitleFile]) {
  assert(exists(file), `${file} is missing.`);
}

const page = read(pageFile);
const archive = read(archiveFile);
const composable = read(composableFile);
const layout = read(layoutFile);
const acceptance = read(acceptanceFile);
const dynamicTitle = read(dynamicTitleFile);

assert(page.includes('title: "Data Management"'), "page metadata/title is missing.");
assert(page.includes('title="Data Management"'), "Admin page header is missing.");
assert(page.includes('label="Managed Records"'), "Managed Records view is missing.");
assert(page.includes('label="Protected System Records"'), "Specialized Records view is missing.");
assert(page.includes("openCreate"), "managed-table create action is missing.");
assert(page.includes("saveCreate"), "managed-table create handler is missing.");
assert(page.includes('label: "View Record"'), "managed-table read/view action is missing.");
assert(page.includes('title="Archive this record?"'), "archive confirmation is missing.");
assert(page.includes('title="Restore this record?"'), "restore confirmation is missing.");
assert(archive.includes('title="Permanently delete archived record?"'), "Archive permanent-delete confirmation is missing.");
assert(archive.includes("impact.dependencies"), "Archive dependency impact presentation is missing.");
assert(archive.includes("impact.confirmationPhrase"), "Archive typed confirmation phrase is missing.");
assert(page.includes("AppResponsiveDataView"), "responsive data presentation is missing.");
assert(page.includes("AppRecordCard"), "mobile record card presentation is missing.");
assert(page.includes("Open Existing Manager"), "protected record handoff to existing managers is missing.");

for (const endpoint of [
  "/api/admin-data-management/catalog",
  "/api/admin-data-management/records/",
  "/api/admin-data-management/lookups/",
  "/archive",
  "/restore",
  "/deletion-impact",
  "/delete-permanently",
]) {
  assert(composable.includes(endpoint), `composable endpoint fragment ${endpoint} is missing.`);
}

assert(layout.includes('to: "/admin/data-management"'), "Admin navigation does not expose Data Management.");
assert(layout.includes('label: "Data Management"'), "Admin Data Management navigation label is missing.");
assert(layout.includes('to: "/admin/archive"'), "Admin navigation does not expose Archive.");
assert(acceptance.includes('staticRoute("administrator", "/admin/data-management", "Data management")'), "acceptance route coverage is missing.");
assert(dynamicTitle.includes('/^\\/admin\\/data-management\\/?$/'), "dynamic page title mapping is missing.");
assert(!page.includes('routeTemplate: "/librarian/'), "Data Management must not send Administrators into Librarian-only frontend routes.");

const pagesRoot = path.join(root, "app/pages");
function vueFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? vueFiles(full) : entry.name.endsWith(".vue") ? [full] : [];
  });
}
const allPages = vueFiles(pagesRoot);
const adminPages = vueFiles(path.join(pagesRoot, "admin"));
assert(allPages.length === 69, `expected 69 Vue pages after Student Record addition, found ${allPages.length}.`);
assert(adminPages.length === 23, `expected 23 Administrator pages after Data Management addition, found ${adminPages.length}.`);

console.log("Administrator Data Management frontend verification passed.");
console.log("Page inventory: 69 total Vue pages, including 23 Administrator pages, Data Management, and Archive.");
