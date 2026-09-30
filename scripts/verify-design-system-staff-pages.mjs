import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const fail = (message) => {
  console.error(`[design-system:ds4] ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => { if (!condition) fail(message); };

function walk(dir) {
  const result = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

const constants = read("app/constants/design-system.ts");
const css = read("app/assets/css/main.css");
const docs = read("docs/SNCBT_DESIGN_SYSTEM_V2.md");
const adminLayout = read("app/layouts/admin.vue");
const librarianLayout = read("app/layouts/librarian.vue");
const pkg = JSON.parse(read("package.json"));

expect(constants.includes('SNCBT_DESIGN_SYSTEM_VERSION = "2.0-ds4"'), "DS version was not advanced to 2.0-ds4.");
expect(constants.includes("SNCBT_STAFF_PAGES"), "Typed DS-4 staff-page contract is missing.");
expect(constants.includes("expectedAdminPages: 23"), "Admin route inventory contract is missing.");
expect(constants.includes("expectedLibrarianPages: 26"), "Librarian route inventory contract is missing.");
expect(adminLayout.includes("sncbt-admin-view sncbt-staff-view"), "Admin layout does not expose the DS-4 staff shell.");
expect(librarianLayout.includes("sncbt-librarian-view sncbt-staff-view"), "Librarian layout does not expose the DS-4 staff shell.");

for (const fragment of [
  "Design System v2 — Wave DS-4",
  ".sncbt-staff-view",
  ".sncbt-staff-page",
  ".sncbt-staff-content",
  ".sncbt-staff-print-page",
  "overscroll-behavior-inline: contain",
  "env(safe-area-inset-bottom)",
]) {
  expect(css.includes(fragment), `DS-4 CSS fragment missing: ${fragment}`);
}

expect(docs.includes("DS-4 — Operational Staff Page Migration"), "DS-4 documentation section is missing.");
expect(docs.includes("all routes are in scope"), "Whole-route UI scope rule is missing from DS-4 documentation.");
expect(docs.includes("preserves the `<script setup>` content"), "DS-4 business-logic preservation rule is missing.");
expect(css.includes("overflow-y: auto"), "The dashboard canvas must remain vertically scrollable for long staff pages.");
expect(css.includes("overscroll-behavior-y: contain"), "The dashboard canvas scroll containment contract is missing.");
expect(
  read("app/pages/admin/accounts-review.vue").includes("sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"),
  "Account Review metrics must reflow before five columns to prevent cramped cards at constrained desktop widths.",
);

const pageRoot = resolve(root, "app/pages");
const pages = walk(pageRoot).filter((file) => file.endsWith(".vue"));
const adminPages = pages.filter((file) => relative(pageRoot, file).replaceAll("\\", "/").startsWith("admin/"));
const librarianPages = pages.filter((file) => relative(pageRoot, file).replaceAll("\\", "/").startsWith("librarian/"));
expect(adminPages.length === 23, `Expected 23 Admin pages, found ${adminPages.length}.`);
expect(librarianPages.length === 26, `Expected 26 Librarian pages, found ${librarianPages.length}.`);
expect(pages.length === 69, `Expected 69 total Vue pages, found ${pages.length}.`);

const redirectOnly = new Set(["admin/index.vue", "admin/monitoring-reports.vue"]);
for (const file of [...adminPages, ...librarianPages]) {
  const rel = relative(pageRoot, file).replaceAll("\\", "/");
  if (redirectOnly.has(rel)) continue;
  const source = read(`app/pages/${rel}`);
  expect(source.includes("sncbt-staff-page"), `${rel} is missing the DS-4 staff-page scope.`);
}

const responsiveRoutes = [
  "admin/users/index.vue",
  "admin/librarians/index.vue",
  "admin/accounts-review.vue",
  "admin/activity.vue",
  "admin/devices.vue",
  "admin/sessions.vue",
  "admin/audit-logs.vue",
  "admin/users/[id]/activity.vue",
  "admin/users/[id]/devices.vue",
  "admin/users/[id]/sessions.vue",
  "librarian/students.vue",
  "librarian/faculty.vue",
  "librarian/visits.vue",
  "librarian/memberships.vue",
  "librarian/fines.vue",
];
for (const rel of responsiveRoutes) {
  const source = read(`app/pages/${rel}`);
  expect(source.includes("<AppResponsiveDataView"), `${rel} is missing its DS-4 responsive data view.`);
  expect(source.includes("<AppRecordCard"), `${rel} is missing its DS-4 mobile record cards.`);
  expect(source.includes("<UTable"), `${rel} lost its desktop data table.`);
  expect(
    source.includes('import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";'),
    `${rel} must explicitly import AppResponsiveDataView so Nuxt does not resolve the shared-directory prefix incorrectly.`,
  );
  expect(
    source.includes('import AppRecordCard from "~/components/shared/AppRecordCard.vue";'),
    `${rel} must explicitly import AppRecordCard so mobile records render reliably.`,
  );
}

const progressiveFilterRoutes = [
  "admin/users/index.vue",
  "admin/librarians/index.vue",
  "admin/activity.vue",
  "admin/devices.vue",
  "admin/sessions.vue",
  "librarian/memberships.vue",
  "librarian/fines.vue",
];
for (const rel of progressiveFilterRoutes) {
  expect(read(`app/pages/${rel}`).includes("<AppFilterBar"), `${rel} is missing DS-4 mobile progressive filters.`);
}

const finesSource = read("app/pages/librarian/fines.vue");
expect((finesSource.match(/<AppResponsiveDataView/g) || []).length >= 2, "Fines page must provide responsive views for both payments and the no-fine calendar.");

// Critical workflow/action markers must remain present after the visual migration.
const protectedMarkers = {
  "app/pages/librarian/borrow.vue": ["confirmBorrowing", "handleCameraBarcodeDetected", "clearTransaction", "useLibraryCirculation"],
  "app/pages/librarian/return.vue": ["processSelectedReturns", "handleCameraBarcodeDetected", "useLibraryCirculation"],
  "app/pages/librarian/visits.vue": ["handleCameraBarcode", "recordTimeIn", "useLibraryVisits"],
  "app/pages/librarian/books/index.vue": ["loadBooks", "exportInventory", "handlePhysicalBookBarcodeDetected", "bookActionItems"],
  "app/pages/librarian/books/register.vue": ["submitRegistration", "validate", "useLibraryOptions"],
  "app/pages/librarian/students.vue": ["openCard", "openEdit", "renew", "printStudentCard"],
  "app/pages/librarian/faculty.vue": ["openProfile", "openEdit", "copyBarcode", "rowActions"],
  "app/pages/librarian/fines.vue": ["openPayment", "openWaiver", "verifyPayment", "waiveFine"],
  "app/pages/librarian/memberships.vue": ["lookupCard", "handleCameraBarcodeDetected", "renewMembership", "createReplacementCharge"],
  "app/pages/admin/users/index.vue": ["openCreate", "openEdit", "openStatus", "createAccount"],
  "app/pages/admin/devices.vue": ["deviceAction", "begin", "confirm"],
  "app/pages/admin/sessions.vue": ["beginRevoke", "confirmRevoke"],
  "app/pages/admin/settings.vue": ["useAdminSettings", "save"],
};
for (const [file, markers] of Object.entries(protectedMarkers)) {
  const source = read(file);
  for (const marker of markers) expect(source.includes(marker), `${file} lost protected workflow marker: ${marker}`);
}

// Guard validation/type-safety fixes found during real-device regression testing.
const visitsPageSource = read("app/pages/librarian/visits.vue");
expect(visitsPageSource.includes("handleCameraBarcode"), "Library Visits must keep its camera barcode handler.");
expect(!visitsPageSource.includes('icon="i-lucide-scan-line"s'), "Library Visits contains malformed page-header icon markup.");

const auditLogSource = read("app/pages/admin/audit-logs.vue");
expect(auditLogSource.includes(':key="record.id"'), "Audit Trail mobile records must use the required numeric record id as the Vue key.");
expect(!auditLogSource.includes(':key="record.id || record.eventId"'), "Audit Trail must not use a nullable fallback expression as a Vue key.");

const membershipsSource = read("app/pages/librarian/memberships.vue");
expect(
  membershipsSource.includes(':label="membership.status ?? membership.storedStatus"'),
  "Membership mobile records must fall back to the non-null stored status label.",
);

expect(pkg.scripts?.["verify:design-system:staff-pages"] === "node scripts/verify-design-system-staff-pages.mjs", "DS-4 verifier is not exposed in package.json.");
expect(pkg.scripts?.["verify:design-system"]?.includes("verify:design-system:staff-pages"), "Main design-system verification does not include DS-4.");

if (!process.exitCode) {
  console.log("SNCBT Design System v2 DS-4 operational staff page verification passed.");
  console.log(`Staff routes: ${adminPages.length} Admin + ${librarianPages.length} Librarian; total application inventory: ${pages.length} Vue pages.`);
  console.log(`Responsive record migrations: ${responsiveRoutes.length} staff routes plus the secondary Fines calendar view.`);
}
