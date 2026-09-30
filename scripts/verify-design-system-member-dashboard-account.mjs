import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = file => readFileSync(resolve(root, file), "utf8");
const fail = message => {
  console.error(`[DS-8.4] ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const studentDashboard = read("app/pages/student/dashboard.vue");
const facultyDashboard = read("app/pages/faculty/dashboard.vue");
const studentAccount = read("app/pages/student/security.vue");
const facultyAccount = read("app/pages/faculty/profile.vue");
const studentLayout = read("app/layouts/student.vue");
const facultyLayout = read("app/layouts/faculty.vue");
const css = read("app/assets/css/main.css");
const pageTitles = read("app/plugins/dynamic-page-title.ts");

for (const [name, source] of [["Student", studentDashboard], ["Faculty", facultyDashboard]]) {
  expect(source.includes("sncbt-member-dashboard-hero"), `${name} dashboard is missing the DS-8.4 member dashboard hero.`);
  expect(source.includes("grid-cols-2"), `${name} dashboard lost its compact phone summary layout.`);
}

expect(studentDashboard.includes("Library at a glance"), "Student dashboard is missing its modern overview section.");
expect(studentDashboard.includes("My books"), "Student dashboard is missing the unified My books workspace.");
expect(studentDashboard.includes("Action center"), "Student dashboard is missing the action center.");
expect(studentDashboard.includes("Open My Account"), "Student dashboard is missing the My Account shortcut.");
expect(studentDashboard.includes('to="/student/security"'), "Student dashboard lost the existing account route.");
expect(studentDashboard.includes('aria-labelledby="quick-actions-heading" class="hidden lg:block"'), "Student dashboard must retain desktop quick access without duplicating mobile navigation.");

expect(facultyDashboard.includes("Department Library overview"), "Faculty dashboard is missing the modern department overview.");
expect(facultyDashboard.includes("Books currently assigned"), "Faculty dashboard is missing the assigned-books workspace.");
expect(facultyDashboard.includes("Action center"), "Faculty dashboard is missing the action center.");
expect(facultyDashboard.includes("Quick access"), "Faculty dashboard is missing the compact service shortcuts.");
expect(facultyDashboard.includes('to="/faculty/profile"'), "Faculty dashboard lost the existing account route.");
expect(facultyDashboard.includes('class="hidden lg:inline-flex"'), "Faculty dashboard must retain duplicate-action reduction on smaller screens.");

expect(studentAccount.includes('title: "My Account"'), "Student account route must use the My Account page title.");
expect(studentAccount.includes('title="My Account"'), "Student account header must use the My Account title.");
expect(!studentAccount.includes("Profile and Security"), "Student account UI still exposes the obsolete Profile and Security wording.");
expect(studentAccount.includes("sncbt-account-identity-card"), "Student account page is missing the modern identity summary.");
expect(studentAccount.includes("sncbt-account-settings-nav"), "Student account page is missing the settings navigation shell.");
expect(studentAccount.includes("<AppFormSection"), "Student account page must use the shared form section pattern.");
expect(studentAccount.includes("<AppStickyFormActions>"), "Student account page must keep mobile-safe form actions.");

expect(facultyAccount.includes('title: "My Account"'), "Faculty account route must use the My Account page title.");
expect(facultyAccount.includes('title="My Account"'), "Faculty account header must use the My Account title.");
expect(facultyAccount.includes("sncbt-account-identity-card"), "Faculty account page is missing the modern identity summary.");
expect(facultyAccount.includes("<AppFormSection"), "Faculty account page must keep the shared form pattern.");
expect(facultyAccount.includes("<AppStickyFormActions>"), "Faculty account page must keep mobile-safe form actions.");
expect(facultyAccount.includes("Faculty information"), "Faculty account page is missing the read-only official-information section.");

for (const [role, source, route] of [
  ["Student", studentLayout, "/student/security"],
  ["Faculty", facultyLayout, "/faculty/profile"],
]) {
  expect(source.includes('label: "My Account"'), `${role} navigation must expose the standard My Account label.`);
  expect(source.includes(route), `${role} navigation lost the existing account route ${route}.`);
}
expect(!studentLayout.includes('label: "Profile and Security"'), "Student navigation still exposes the obsolete Profile and Security label.");
expect(!facultyLayout.includes('label: "Profile"'), "Faculty navigation still exposes the generic Profile label.");
const studentAccountTitleLine = pageTitles.split("\n").find(line => line.includes("student") && line.includes("security"));
const facultyAccountTitleLine = pageTitles.split("\n").find(line => line.includes("faculty") && line.includes("profile"));
expect(studentAccountTitleLine?.includes('title: "My Account"'), "Student browser page title must use My Account.");
expect(facultyAccountTitleLine?.includes('title: "My Account"'), "Faculty browser page title must use My Account.");

for (const token of ["saveProfile", "submitPasswordChange", "revokeSession", "revokeOthers", "toggleTrust"]) {
  expect(studentAccount.includes(token), `Student My Account lost protected workflow token: ${token}`);
}
for (const token of ["fillForm", "save", "load"]) {
  expect(facultyAccount.includes(token), `Faculty My Account lost protected workflow token: ${token}`);
}
for (const token of ["dashboard.refresh", "currentLoans", "activeReservations", "notifications"]) {
  expect(studentDashboard.includes(token), `Student dashboard lost protected data/workflow token: ${token}`);
}
for (const token of ["portal.loadDashboard", "currentLoans", "notice", "policy"]) {
  expect(facultyDashboard.includes(token), `Faculty dashboard lost protected data/workflow token: ${token}`);
}

expect(css.includes("Design System v2 — DS-8.4"), "Global CSS is missing the DS-8.4 member dashboard/account section.");
expect(css.includes(".sncbt-member-dashboard-hero"), "Global CSS is missing the member dashboard hero contract.");
expect(css.includes(".sncbt-account-identity-card"), "Global CSS is missing the account identity-card contract.");
expect(css.includes(".sncbt-account-settings-nav"), "Global CSS is missing the account settings navigation contract.");
expect(!css.match(/sncbt-member-dashboard-hero[\s\S]{0,1200}filter:\s*blur\(/), "DS-8.4 dashboard theming must not introduce expensive blur filters.");

if (!process.exitCode) {
  console.log("Design System DS-8.4 member dashboard and account verification passed.");
}
