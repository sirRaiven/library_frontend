import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const requireText = (file, text, message) => {
  const source = read(file);
  if (!source.includes(text)) failures.push(`${file}: ${message}`);
};
const rejectText = (file, text, message) => {
  const source = read(file);
  if (source.includes(text)) failures.push(`${file}: ${message}`);
};

const layout = "app/layouts/librarian.vue";
requireText(layout, 'title: "Student Record"', "Student Record needs a dedicated shell title.");
requireText(layout, 'title: "Fines & Payments"', "Fines page needs a dedicated shell title.");
requireText(layout, 'title: "Registration Approvals"', "Registration approvals need a dedicated shell title.");
requireText(layout, 'title: "Registration QR Code"', "Registration QR needs a dedicated shell title.");

const dashboard = "app/pages/librarian/dashboard.vue";
requireText(dashboard, '/librarian/history?category=borrowing&search=Borrowed', "Borrowed metric must open filtered borrowing history.");
requireText(dashboard, '/librarian/history?category=borrowing&search=Overdue', "Overdue queue must open filtered borrowing history.");
requireText(dashboard, '/librarian/reservations?status=Pending', "Reservation queue must deep-link to Pending reservations.");
requireText(dashboard, 'title: "Student Records"', "Student Records must be available from quick actions.");
rejectText(dashboard, '/librarian/borrow?status=Overdue', "Do not keep a non-functional overdue query on the Borrow workflow.");

const history = "app/pages/librarian/history.vue";
requireText(history, 'queryChoice("category"', "History must honor category deep links.");
requireText(history, 'queryText("search")', "History must honor search deep links.");
requireText(history, 'link-member-record', "Librarian history must expose Student Record links.");
requireText(history, 'aria-label="Search Library history"', "History search requires an accessible name.");

const reservations = "app/pages/librarian/reservations.vue";
requireText(reservations, 'route.query.status', "Reservations must honor dashboard status deep links.");
requireText(reservations, 'label="Student Record"', "Reservation records must link to Student Records when possible.");
requireText(reservations, 'aria-label="Reservation status"', "Reservation status filter requires an accessible name.");

for (const file of [
  "app/pages/librarian/borrow.vue",
  "app/pages/librarian/return.vue",
  "app/pages/librarian/visits.vue",
  "app/pages/librarian/fines.vue",
  "app/pages/librarian/memberships.vue",
]) {
  requireText(file, "Student Record", "Student-facing Librarian workflows must expose Student Record access.");
}

requireText("app/pages/librarian/visits.vue", 'aria-label="Search Library visits"', "Visit search requires an accessible name.");
requireText("app/pages/librarian/fines.vue", 'aria-label="Search fine records"', "Fine search requires an accessible name.");
requireText("app/pages/librarian/memberships.vue", 'aria-label="Search membership records"', "Membership search requires an accessible name.");

const studentRecord = "app/pages/librarian/students/[identifier]/record.vue";
requireText(studentRecord, '{ label: "Fines", value: historySummary.fine', "Student Record activity summary must include fines.");
requireText(studentRecord, "The start date must be earlier", "Student Record must reject inverted activity date ranges.");

if (failures.length) {
  console.error("Phase 4 Librarian portal verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Phase 4 Librarian portal verification passed.");
