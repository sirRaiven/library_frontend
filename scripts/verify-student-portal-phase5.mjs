import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const requireText = (file, text, message) => {
  if (!read(file).includes(text)) failures.push(`${file}: ${message}`);
};

const dashboard = "app/pages/student/dashboard.vue";
requireText(dashboard, "/student/borrowings?attention=overdue", "Overdue dashboard action must open the overdue borrowing view.");
requireText(dashboard, "/student/borrowings?attention=due-soon", "Due-soon dashboard action must open the due-soon borrowing view.");
requireText(dashboard, "/student/reservations?status=ready", "Ready reservations must open the pickup-ready reservation view.");

const borrowings = "app/pages/student/borrowings.vue";
requireText(borrowings, 'queryText("attention"', "Borrowings must honor attention deep links.");
requireText(borrowings, 'aria-label="Current loan attention filter"', "Borrowing attention filters require an accessible group name.");
requireText(borrowings, 'aria-label="Search borrowing records"', "Borrowing search requires an accessible name.");
requireText(borrowings, 'aria-live="polite"', "Borrowing results need a polite live announcement.");

const reservations = "app/pages/student/reservations.vue";
requireText(reservations, 'route.query.status === "ready"', "Reservations must honor ready-for-pickup deep links.");
requireText(reservations, 'label: "Ready for Pickup"', "Reservations must expose a ready-for-pickup filter.");
requireText(reservations, ':aria-pressed="status === item.value"', "Reservation status controls must expose selected state.");
requireText(reservations, 'aria-live="polite"', "Reservation results need a polite live announcement.");

const history = "app/pages/student/history.vue";
requireText(history, 'queryChoice("category"', "Student History must preserve category deep links.");
requireText(history, 'queryText("search")', "Student History must preserve search deep links.");
requireText(history, 'aria-label="Search my Library history"', "Student History search requires an accessible name.");

const notifications = "app/pages/student/notifications.vue";
requireText(notifications, "syncRouteQuery", "Notifications must keep filter state in the URL.");
requireText(notifications, ':aria-pressed="filters.view === item.value"', "Notification views must expose selected state.");
requireText(notifications, 'aria-live="polite"', "Notification results need a polite live announcement.");

const catalog = "app/pages/student/books/index.vue";
requireText(catalog, 'aria-live="polite"', "Catalog result changes need a polite live announcement.");

const card = "app/pages/student/library-card.vue";
requireText(card, 'title="Library Card and membership are separate"', "Library Card must explain the distinction between the physical card and term membership.");

for (const file of [
  "app/components/student/StudentBorrowingCard.vue",
  "app/components/student/StudentReservationCard.vue",
]) {
  requireText(file, "View book details for", "Student circulation cards must provide an accessible book-detail link.");
}

if (failures.length) {
  console.error("Phase 5 Student portal verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Phase 5 Student portal verification passed.");
