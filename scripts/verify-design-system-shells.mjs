import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const fail = (message) => {
  console.error(`[design-system:ds2] ${message}`);
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

const admin = read("app/layouts/admin.vue");
const librarian = read("app/layouts/librarian.vue");
const student = read("app/layouts/student.vue");
const faculty = read("app/layouts/faculty.vue");
const defaultLayout = read("app/layouts/default.vue");
const bottomNav = read("app/components/shared/PortalMobileBottomNav.vue");
const css = read("app/assets/css/main.css");
const constants = read("app/constants/design-system.ts");
const docs = read("docs/SNCBT_DESIGN_SYSTEM_V2.md");
const login = read("app/pages/index.vue");
const registration = read("app/pages/student-registration.vue");

expect(constants.includes('SNCBT_DESIGN_SYSTEM_VERSION = "2.0-ds4"'), "DS version was not advanced to 2.0-ds4.");
expect(constants.includes('mobileBottomNavigationRoles: ["student", "faculty"]'), "Typed Student/Faculty mobile navigation contract is missing.");
expect(constants.includes("mobileDrawerMaxRem: 21"), "Typed mobile drawer width contract is missing.");

for (const [name, source] of [["Administrator", admin], ["Librarian", librarian], ["Student", student], ["Faculty", faculty]]) {
  expect(source.includes("sncbt-app-sidebar"), `${name} shell is missing the DS-2 sidebar contract.`);
  expect(source.includes("sncbt-app-navbar"), `${name} shell is missing the DS-2 navbar contract.`);
}

expect(admin.includes("sncbt-density-compact"), "Administrator shell is not using compact operational density.");
expect(librarian.includes("sncbt-density-compact"), "Librarian shell is not using compact operational density.");
expect(student.includes("sncbt-density-comfortable"), "Student shell is not using comfortable density.");
expect(faculty.includes("sncbt-density-comfortable"), "Faculty shell is not using comfortable density.");

expect(student.includes('PortalMobileBottomNav'), "Student shell is missing mobile bottom navigation.");
expect(faculty.includes('PortalMobileBottomNav'), "Faculty shell is missing mobile bottom navigation.");
expect(!admin.includes('<PortalMobileBottomNav'), "Administrator should use a drawer, not Student/Faculty mobile bottom navigation.");
expect(!librarian.includes('<PortalMobileBottomNav'), "Librarian should use a drawer, not Student/Faculty mobile bottom navigation.");

for (const route of ["/student/dashboard", "/student/books", "/student/borrowings", "/student/reservations"]) {
  expect(student.includes(route), `Student mobile primary route missing: ${route}`);
}
for (const route of ["/student/history", "/student/library-card", "/student/notifications", "/student/security"]) {
  expect(student.includes(route), `Student secondary route missing from complete navigation: ${route}`);
}
for (const route of ["/faculty/dashboard", "/faculty/books", "/faculty/borrowings", "/faculty/reports", "/faculty/profile"]) {
  expect(faculty.includes(route), `Faculty route missing from shell navigation: ${route}`);
}

expect(student.includes('class="hidden lg:inline-flex"\n                icon="i-lucide-panel-left"'), "Student phone shell still exposes a duplicate top navigation drawer trigger.");
expect(faculty.includes('class="hidden lg:inline-flex"\n                icon="i-lucide-panel-left"'), "Faculty phone shell still exposes a duplicate top navigation drawer trigger.");
expect(student.includes("sncbt-mobile-bottom-nav-spacer"), "Student content does not reserve space for fixed mobile navigation.");
expect(faculty.includes("sncbt-mobile-bottom-nav-spacer"), "Faculty content does not reserve space for fixed mobile navigation.");
expect(student.includes("sncbt-has-mobile-bottom-nav"), "Student shell is missing the mobile bottom-navigation host marker.");
expect(faculty.includes("sncbt-has-mobile-bottom-nav"), "Faculty shell is missing the mobile bottom-navigation host marker.");
expect(student.includes("sncbt-mobile-nav-scrollport"), "Student scrollport is missing bottom-navigation clearance handling.");
expect(faculty.includes("sncbt-mobile-nav-scrollport"), "Faculty scrollport is missing bottom-navigation clearance handling.");

for (const fragment of [
  'aria-label="Primary mobile navigation"',
  'aria-current="item.active ? \'page\' : undefined"',
  'aria-haspopup="dialog"',
  "emit('more')",
]) {
  expect(bottomNav.includes(fragment), `Mobile bottom navigation accessibility/behavior fragment missing: ${fragment}`);
}

for (const fragment of [
  ".sncbt-mobile-bottom-nav",
  "env(safe-area-inset-bottom)",
  ".sncbt-sidebar-mobile-content",
  "transition: none !important",
  ".sncbt-mobile-bottom-nav-spacer",
  "--sncbt-mobile-bottom-nav-clearance",
  ".sncbt-mobile-nav-scrollport",
  ".sncbt-mobile-bottom-nav-spacer::after",
  ".sncbt-has-mobile-bottom-nav .sncbt-form-actions",
]) {
  expect(css.includes(fragment), `DS-2 responsive shell CSS fragment missing: ${fragment}`);
}

expect(defaultLayout.includes("AppSkipLink"), "Public default shell is missing the skip link.");
expect(defaultLayout.includes("sncbt-public-default-layout"), "Public default shell marker is missing.");
expect(login.includes("sncbt-public-entry"), "Sign-in entry route is not marked as part of the public shell.");
expect(registration.includes("sncbt-public-registration-shell"), "Student registration route is not marked as part of the public shell.");
expect(registration.includes("<AppSkipLink />"), "Student registration route is missing direct skip navigation.");

expect(docs.includes("DS-2 — Application Shells & Navigation"), "DS-2 shell documentation is missing.");
expect(docs.includes("All routes are in scope"), "Whole-system route coverage rule disappeared from documentation.");

const pageRoot = resolve(root, "app/pages");
const pages = walk(pageRoot).filter((file) => file.endsWith(".vue"));
expect(pages.length === 69, `Expected 69 Vue page files, found ${pages.length}. DS-2 must not add/remove application pages.`);

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
  console.log("SNCBT Design System v2 DS-2 application shell verification passed.");
  console.log(`Route/page inventory preserved: ${pages.length} Vue pages.`);
  console.log("Mobile shell model: Admin/Librarian drawer; Student/Faculty 4 primary destinations + More.");
}
