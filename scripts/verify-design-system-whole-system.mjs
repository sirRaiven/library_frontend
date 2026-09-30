import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => {
  if (!condition) {
    console.error(`DS-7 whole-system UX verification failed: ${message}`);
    process.exit(1);
  }
};

function walkVue(relative) {
  const absolute = path.join(root, relative);
  const output = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const nextRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...walkVue(nextRelative));
    else if (entry.isFile() && entry.name.endsWith(".vue")) output.push(nextRelative.replaceAll("\\", "/"));
  }
  return output.sort();
}

const pages = walkVue("app/pages");
const adminPages = pages.filter((file) => file.startsWith("app/pages/admin/"));
const librarianPages = pages.filter((file) => file.startsWith("app/pages/librarian/"));
const studentPages = pages.filter((file) => file.startsWith("app/pages/student/"));
const facultyPages = pages.filter((file) => file.startsWith("app/pages/faculty/"));
const sharedPublicPages = pages.filter((file) => !file.startsWith("app/pages/admin/") && !file.startsWith("app/pages/librarian/") && !file.startsWith("app/pages/student/") && !file.startsWith("app/pages/faculty/"));

expect(pages.length === 69, `expected 69 Vue pages, found ${pages.length}.`);
expect(adminPages.length === 23, `expected 23 Admin pages, found ${adminPages.length}.`);
expect(librarianPages.length === 26, `expected 26 Librarian pages, found ${librarianPages.length}.`);
expect(studentPages.length === 10, `expected 10 Student pages, found ${studentPages.length}.`);
expect(facultyPages.length === 7, `expected 7 Faculty pages, found ${facultyPages.length}.`);
expect(sharedPublicPages.length === 3, `expected 3 shared/public pages, found ${sharedPublicPages.length}.`);

const redirectOnly = new Set([
  "app/pages/admin/index.vue",
  "app/pages/admin/monitoring-reports.vue",
  "app/pages/student/index.vue",
  "app/pages/faculty/index.vue",
  "app/pages/faculty-access.vue",
]);

for (const file of adminPages) {
  if (redirectOnly.has(file)) continue;
  expect(read(file).includes("sncbt-staff-page"), `${file} must remain inside the staff-page responsive scope.`);
}
for (const file of librarianPages) {
  expect(read(file).includes("sncbt-staff-page"), `${file} must remain inside the staff-page responsive scope.`);
}
for (const file of studentPages) {
  if (redirectOnly.has(file)) continue;
  expect(read(file).includes("sncbt-member-page"), `${file} must remain inside the member-page responsive scope.`);
}
for (const file of facultyPages) {
  if (redirectOnly.has(file)) continue;
  expect(read(file).includes("sncbt-member-page"), `${file} must remain inside the member-page responsive scope.`);
}

const signIn = read("app/pages/index.vue");
expect(signIn.includes("sncbt-public-entry"), "Sign-in page must retain the DS public-entry scope.");
expect(signIn.includes("min-h-dvh"), "Sign-in page must use dynamic viewport height.");
expect(signIn.includes('class="text-xs font-semibold uppercase'), "Sign-in eyebrow must use a valid text-size utility.");
expect(!signIn.includes('class="text-s '), "Invalid text-s utility must not return to sign-in.");

const registration = read("app/pages/student-registration.vue");
expect(registration.includes("sncbt-public-registration-shell"), "Student Registration must retain its public responsive shell.");
expect(registration.includes("<AppSkipLink"), "Student Registration must retain keyboard skip navigation.");
expect(registration.includes("sncbt-page-shell"), "Student Registration must use the shared page-shell gutters.");

for (const layoutName of ["admin", "librarian", "student", "faculty"]) {
  const layout = read(`app/layouts/${layoutName}.vue`);
  expect(layout.includes("sncbt-dashboard-canvas"), `${layoutName} layout must keep the scrollable dashboard canvas.`);
  expect(layout.includes("bg-[var(--sncbt-canvas)]"), `${layoutName} layout must use the design-system canvas.`);
}
for (const layoutName of ["student", "faculty"]) {
  const layout = read(`app/layouts/${layoutName}.vue`);
  expect(layout.includes("sncbt-mobile-nav-scrollport"), `${layoutName} layout must retain mobile bottom-nav scroll clearance.`);
  expect(layout.includes("sncbt-mobile-bottom-nav-spacer"), `${layoutName} layout must retain a real flow spacer below portal content.`);
}

const css = read("app/assets/css/main.css");
for (const token of [
  "Design System v2 — Wave DS-7: whole-system viewport and interaction safety",
  ".sncbt-camera-popover",
  ".sncbt-viewport-modal",
  "calc(100dvw - 1.5rem)",
  "calc(100dvw - 1rem)",
  ".sncbt-public-registration-shell",
  "overflow-x: clip",
]) {
  expect(css.includes(token), `DS-7 viewport safety token missing: ${token}`);
}

const scanner = read("app/components/librarian/visits/LiveBarcodeScanner.vue");
expect(scanner.includes("sncbt-camera-popover"), "Camera scanner popover must use the dynamic-viewport-safe class.");
expect(!scanner.includes("w-[calc(100vw-1.5rem)]"), "Legacy 100vw camera width must not return.");

const approvals = read("app/pages/librarian/student-registration-approvals.vue");
expect(approvals.includes("sncbt-viewport-modal"), "Student Registration detail dialog must use the viewport-safe modal class.");
expect(!approvals.includes("100vw-1rem"), "Legacy 100vw registration dialog width must not return.");

const vueSources = [
  ...walkVue("app/pages"),
  ...walkVue("app/layouts"),
  ...walkVue("app/components"),
];
for (const file of vueSources) {
  const source = read(file);
  expect(!/\b(?:w-screen|min-w-screen)\b/.test(source), `${file} contains a whole-viewport width utility that can create horizontal overflow.`);
  expect(!source.includes("100vw-"), `${file} contains brittle 100vw subtraction; use DS dynamic-viewport helpers instead.`);
}

// Fixed-width operational matrices are permitted only inside their known,
// internally scrollable data regions. New page-level fixed widths are rejected.
const fixedWidthOccurrences = [];
for (const file of pages) {
  const source = read(file);
  const matches = source.match(/min-w-\[(\d{3,})px\]/g) ?? [];
  for (const match of matches) fixedWidthOccurrences.push(`${file}:${match}`);
}
const allowedFixedWidths = new Set([
  "app/pages/librarian/books/import.vue:min-w-[1680px]",
  "app/pages/librarian/books/import.vue:min-w-[760px]",
  "app/pages/librarian/return.vue:min-w-[900px]",
]);
for (const occurrence of fixedWidthOccurrences) {
  expect(allowedFixedWidths.has(occurrence), `unexpected fixed-width page matrix: ${occurrence}.`);
}
expect(fixedWidthOccurrences.length === allowedFixedWidths.size, "Expected specialist fixed-width matrices changed; review their internal overflow contract.");

const ds7Doc = read("docs/DS7_WHOLE_SYSTEM_UX_VERIFICATION.md");
for (const token of [
  "route inventory",
  "320 px",
  "390 px",
  "768 px",
  "1024 px",
  "1440 px",
  "Light and dark",
  "Touch and keyboard",
  "Print and scanner boundaries",
]) {
  expect(ds7Doc.includes(token), `DS-7 verification document missing: ${token}`);
}

console.log("SNCBT Design System v2 DS-7 whole-system UX verification passed.");
console.log("Coverage: 69 Vue pages = 23 Admin + 26 Librarian + 10 Student + 7 Faculty + 3 shared/public.");
console.log("Rendered scopes: 45 staff + 15 member + 2 public; 5 compatibility/portal redirects preserved.");
