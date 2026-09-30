import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const fail = (message) => {
  console.error(`[DS-5] ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const renderedPages = [
  "app/pages/student/dashboard.vue",
  "app/pages/student/books/index.vue",
  "app/pages/student/books/[documentId].vue",
  "app/pages/student/borrowings.vue",
  "app/pages/student/reservations.vue",
  "app/pages/student/history.vue",
  "app/pages/student/library-card.vue",
  "app/pages/student/notifications.vue",
  "app/pages/student/security.vue",
  "app/pages/faculty/dashboard.vue",
  "app/pages/faculty/books/index.vue",
  "app/pages/faculty/books/[documentId].vue",
  "app/pages/faculty/borrowings.vue",
  "app/pages/faculty/reports.vue",
  "app/pages/faculty/profile.vue",
];

const redirectPages = [
  "app/pages/student/index.vue",
  "app/pages/faculty/index.vue",
];

for (const file of [...renderedPages, ...redirectPages]) {
  expect(existsSync(resolve(root, file)), `Missing member portal route file: ${file}`);
}

for (const file of renderedPages) {
  const source = read(file);
  expect(source.includes("sncbt-member-page"), `${file} is missing the DS-5 member-page marker.`);
  expect(!source.includes("mb-12"), `${file} still contains page-level mb-12 navigation-clearance hacks.`);
}

const filterPages = [
  "app/pages/student/books/index.vue",
  "app/pages/student/borrowings.vue",
  "app/pages/student/history.vue",
  "app/pages/student/notifications.vue",
  "app/pages/faculty/books/index.vue",
  "app/pages/faculty/borrowings.vue",
  "app/pages/faculty/reports.vue",
];
for (const file of filterPages) {
  const source = read(file);
  expect(source.includes('import AppFilterBar from "~/components/shared/AppFilterBar.vue";'), `${file} must explicitly import AppFilterBar.`);
  expect(source.includes("<AppFilterBar"), `${file} must use the shared progressive filter pattern.`);
}

const sharedCard = read("app/components/shared/PortalBookCard.vue");
expect(sharedCard.includes("hidden shrink-0") && sharedCard.includes("sm:block"), "PortalBookCard must keep the decorative cover out of the phone layout.");
expect(sharedCard.includes("sm:w-40"), "PortalBookCard must retain the larger desktop/tablet cover width.");
expect(sharedCard.includes("View details"), "PortalBookCard must preserve the detail-route action.");

const studentBorrowingCard = read("app/components/student/StudentBorrowingCard.vue");
expect(studentBorrowingCard.includes("h-20 w-14"), "Student borrowing cards must use the compact phone cover treatment.");
expect(studentBorrowingCard.includes('class="hidden sm:block"'), "Student borrowing cards must progressively hide technical copy metadata on phones.");

const reservationCard = read("app/components/student/StudentReservationCard.vue");
expect(reservationCard.includes("h-20 w-14"), "Student reservation cards must use the compact phone cover treatment.");
expect(reservationCard.includes("grid grid-cols-2"), "Student reservation metadata must use a phone-friendly two-column layout.");

const studentDetail = read("app/pages/student/books/[documentId].vue");
const facultyDetail = read("app/pages/faculty/books/[documentId].vue");
expect(studentDetail.includes("min-h-[15rem]") && studentDetail.includes("sm:min-h-[28rem]"), "Student detail cover must be compact on phones and expanded on larger screens.");
expect(facultyDetail.includes("min-h-[15rem]") && facultyDetail.includes("sm:min-h-[30rem]"), "Faculty detail cover must be compact on phones and expanded on larger screens.");

for (const file of [
  "app/pages/student/dashboard.vue",
  "app/pages/student/borrowings.vue",
  "app/pages/student/reservations.vue",
  "app/pages/student/history.vue",
  "app/pages/student/notifications.vue",
  "app/pages/student/books/[documentId].vue",
  "app/pages/faculty/dashboard.vue",
  "app/pages/faculty/borrowings.vue",
  "app/pages/student/security.vue",
]) {
  expect(read(file).includes("grid-cols-2"), `${file} must preserve a two-column phone summary where applicable.`);
}

const libraryCard = read("app/pages/student/library-card.vue");
expect(libraryCard.includes('v-if="libraryCard.card.value.renewal.required"'), "Library-card renewal requirements must display only when renewal is required.");
expect(!libraryCard.includes("Changes saved by the Librarian in"), "Redundant Card Designer implementation guidance should not be shown to Students.");

const studentDashboard = read("app/pages/student/dashboard.vue");
expect(studentDashboard.includes('aria-labelledby="quick-actions-heading" class="hidden lg:block"'), "Student dashboard duplicate quick actions must be reduced on phone/tablet widths.");

const facultyDashboard = read("app/pages/faculty/dashboard.vue");
expect(facultyDashboard.includes('class="hidden lg:inline-flex"'), "Faculty dashboard duplicate navigation actions must be hidden on mobile.");

const facultyProfile = read("app/pages/faculty/profile.vue");
expect(facultyProfile.includes('import AppFormSection from "~/components/shared/AppFormSection.vue";'), "Faculty profile must use AppFormSection.");
expect(facultyProfile.includes('import AppStickyFormActions from "~/components/shared/AppStickyFormActions.vue";'), "Faculty profile must use AppStickyFormActions.");
expect(facultyProfile.includes("<AppStickyFormActions>"), "Faculty profile must expose bottom-nav-aware form actions.");
expect(!facultyProfile.includes("Account security page will follow"), "Obsolete future-phase messaging must not remain in Faculty Profile.");

const css = read("app/assets/css/main.css");
expect(css.includes("Design System v2 — Wave DS-5"), "Global CSS is missing the DS-5 member-experience section.");
expect(css.includes(".sncbt-member-page"), "Global CSS is missing the member-page contract.");

const studentLayout = read("app/layouts/student.vue");
const facultyLayout = read("app/layouts/faculty.vue");
for (const [role, source] of [["Student", studentLayout], ["Faculty", facultyLayout]]) {
  expect(source.includes("sncbt-mobile-nav-scrollport"), `${role} shell lost the iOS/mobile scroll clearance marker.`);
  expect(source.includes("sncbt-mobile-bottom-nav-spacer"), `${role} shell lost the mobile bottom-nav flow spacer.`);
  expect(source.includes("PortalMobileBottomNav"), `${role} shell lost its phone primary navigation.`);
}

// Protected workflow/source tokens: presentation changes must not remove these actions.
const protectedTokens = new Map([
  ["app/pages/student/reservations.vue", ["createReservations", "confirmCancellation", "searchBooks"]],
  ["app/pages/student/security.vue", ["saveProfile", "submitPasswordChange", "revokeSession", "revokeOthers", "toggleTrust"]],
  ["app/pages/student/notifications.vue", ["markAllRead", "openNotification", "setRead", "refresh"]],
  ["app/pages/student/books/index.vue", ["submitSearch", "clearFilters", "syncRoute"]],
  ["app/pages/faculty/borrowings.vue", ["beginReport", "submitReport", "load"]],
  ["app/pages/faculty/profile.vue", ["fillForm", "save", "load"]],
  ["app/pages/faculty/reports.vue", ["load", "statusColor", "usageColor"]],
]);
for (const [file, tokens] of protectedTokens) {
  const source = read(file);
  for (const token of tokens) expect(source.includes(token), `${file} lost protected workflow token: ${token}`);
}

if (!process.exitCode) {
  console.log("Design System DS-5 member experience verification passed: 15 rendered member pages + 2 redirect routes covered.");
}
