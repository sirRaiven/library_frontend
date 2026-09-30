import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const fail = (message) => {
  console.error(`[design-system:ds3] ${message}`);
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

const componentRoot = "app/components/shared";
const requiredComponents = [
  "AppActionBar.vue",
  "AppOverflowActions.vue",
  "AppFilterBar.vue",
  "AppStatusBadge.vue",
  "AppAsyncState.vue",
  "AppResponsiveDataView.vue",
  "AppRecordCard.vue",
  "AppFormSection.vue",
  "AppStickyFormActions.vue",
  "AppDialogFrame.vue",
  "AppPageHeader.vue",
  "AppSectionHeader.vue",
  "AppMetricCard.vue",
  "AppEmptyState.vue",
];

for (const name of requiredComponents) {
  expect(existsSync(resolve(root, componentRoot, name)), `Required shared component missing: ${name}`);
}

const actionBar = read(`${componentRoot}/AppActionBar.vue`);
const overflow = read(`${componentRoot}/AppOverflowActions.vue`);
const filterBar = read(`${componentRoot}/AppFilterBar.vue`);
const status = read(`${componentRoot}/AppStatusBadge.vue`);
const asyncState = read(`${componentRoot}/AppAsyncState.vue`);
const responsive = read(`${componentRoot}/AppResponsiveDataView.vue`);
const record = read(`${componentRoot}/AppRecordCard.vue`);
const formSection = read(`${componentRoot}/AppFormSection.vue`);
const formActions = read(`${componentRoot}/AppStickyFormActions.vue`);
const dialog = read(`${componentRoot}/AppDialogFrame.vue`);
const pageHeader = read(`${componentRoot}/AppPageHeader.vue`);
const css = read("app/assets/css/main.css");
const constants = read("app/constants/design-system.ts");
const docs = read("docs/SNCBT_DESIGN_SYSTEM_V2.md");
const pkg = JSON.parse(read("package.json"));

expect(constants.includes('SNCBT_DESIGN_SYSTEM_VERSION = "2.0-ds4"'), "DS version was not advanced to 2.0-ds4.");
expect(constants.includes("mobileDataViewBreakpointPx: SNCBT_BREAKPOINTS.md"), "Typed responsive-data breakpoint contract is missing.");
expect(constants.includes("mobilePrimaryActionLimit: 1"), "One-primary-action mobile contract is missing.");
expect(constants.includes("defaultLoadingRows: 4"), "Shared loading-state contract is missing.");

expect(actionBar.includes("sncbt-action-bar--mobile-sticky"), "AppActionBar mobile sticky option is missing.");
expect(overflow.includes("<UDropdownMenu"), "AppOverflowActions does not use the established dropdown interaction.");
expect(filterBar.includes("Search and filters"), "AppFilterBar lacks an accessible region label.");
expect(filterBar.includes("Filters (${activeCount})"), "AppFilterBar does not expose active-filter count on mobile.");
expect(filterBar.includes('emit("update:mobileFiltersOpen"'), "AppFilterBar mobile progressive-disclosure behavior is missing.");
expect(status.includes("sncbt-status-badge__dot"), "AppStatusBadge visible non-color status cue option is missing.");
expect(asyncState.includes('aria-busy="true"'), "AppAsyncState loading announcement contract is missing.");
expect(asyncState.includes("AppEmptyState"), "AppAsyncState is not reusing the shared empty state.");
expect(responsive.includes('class="md:hidden"'), "Responsive data view mobile branch is missing.");
expect(responsive.includes('class="hidden md:block"'), "Responsive data view desktop branch is missing.");
expect(record.includes("sncbt-record-card__title-link"), "Mobile record card navigation pattern is missing.");
expect(!record.includes("<component\n    :is=\"to ?"), "Record card must not wrap row action controls inside a navigation link.");
expect(formSection.includes("sncbt-form-section__body"), "Shared form section body contract is missing.");
expect(formActions.includes("sncbt-form-actions"), "Sticky form action pattern is missing.");
expect(dialog.includes("sncbt-dialog-frame__footer"), "Dialog action hierarchy is missing.");
expect(pageHeader.includes("description?: string"), "AppPageHeader description should be optional for concise operational pages.");

for (const fragment of [
  "Design System v2 — Wave DS-3",
  ".sncbt-filter-bar",
  ".sncbt-status-badge",
  ".sncbt-record-card",
  ".sncbt-form-actions",
  ".sncbt-dialog-frame",
  "@media (max-width: 767px)",
  "env(safe-area-inset-bottom)",
]) {
  expect(css.includes(fragment), `DS-3 shared interaction CSS fragment missing: ${fragment}`);
}

expect(docs.includes("DS-3 — Shared Components & Interaction Patterns"), "DS-3 documentation section is missing.");
expect(docs.includes("All routes are in scope"), "Whole-system UI scope rule disappeared from design-system documentation.");
expect(docs.includes("one primary action"), "Action hierarchy rule is missing from DS-3 documentation.");
expect(docs.includes("below 768 px: semantic record cards/list"), "Responsive data-view rule is missing from documentation.");

expect(pkg.scripts?.["verify:design-system:components"] === "node scripts/verify-design-system-components.mjs", "DS-3 verification script is not exposed in package.json.");
expect(pkg.scripts?.["verify:design-system"]?.includes("verify:design-system:components"), "Main design-system verification does not include DS-3.");

const pageRoot = resolve(root, "app/pages");
const pages = walk(pageRoot).filter((file) => file.endsWith(".vue"));
expect(pages.length === 69, `Expected 69 Vue page files, found ${pages.length}. DS-3 must not add/remove application pages.`);

const groups = {
  admin: pages.filter((file) => relative(pageRoot, file).replaceAll("\\", "/").startsWith("admin/")).length,
  librarian: pages.filter((file) => relative(pageRoot, file).replaceAll("\\", "/").startsWith("librarian/")).length,
  student: pages.filter((file) => relative(pageRoot, file).replaceAll("\\", "/").startsWith("student/")).length,
  faculty: pages.filter((file) => relative(pageRoot, file).replaceAll("\\", "/").startsWith("faculty/")).length,
};
expect(groups.admin === 22, `Admin page inventory changed: ${groups.admin}`);
expect(groups.librarian === 26, `Librarian page inventory changed: ${groups.librarian}`);
expect(groups.student === 10, `Student page inventory changed: ${groups.student}`);
expect(groups.faculty === 7, `Faculty page inventory changed: ${groups.faculty}`);

if (!process.exitCode) {
  console.log("SNCBT Design System v2 DS-3 shared component verification passed.");
  console.log(`Shared component contracts: ${requiredComponents.length}; route/page inventory preserved: ${pages.length} Vue pages.`);
  console.log("DS-3 changes interaction primitives only; route migrations begin in DS-4.");
}
