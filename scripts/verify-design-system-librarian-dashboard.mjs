import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "app/pages/librarian/dashboard.vue");
const page = fs.readFileSync(file, "utf8");

const required = [
  "Circulation Desk",
  "Priority Queue",
  "Recent Circulation",
  "dashboard.unreadNotifications",
  "auth.authFetch<LibrarianDashboardResponse>",
  '"/api/circulation/dashboard-summary"',
  'to: "/librarian/visits"',
  'to: "/librarian/borrow"',
  'to: "/librarian/return"',
  'to: "/librarian/books/register"',
  'to="/librarian/notifications"',
  'to="/librarian/borrow"',
];

const missing = required.filter((token) => !page.includes(token));
if (missing.length) {
  console.error("DS-8.2 Librarian Dashboard verification failed. Missing protected tokens:");
  for (const token of missing) console.error(` - ${token}`);
  process.exit(1);
}

const forbidden = [
  "sncbt-mobile-record-list md:hidden",
  "sncbt-table-surface hidden overflow-x-auto md:block",
  '<table class="w-full min-w-[46rem]">',
];

const present = forbidden.filter((token) => page.includes(token));
if (present.length) {
  console.error("DS-8.2 Librarian Dashboard verification failed. Duplicate/legacy dashboard representations remain:");
  for (const token of present) console.error(` - ${token}`);
  process.exit(1);
}

console.log("DS-8.2 Librarian Dashboard layout verification passed.");
console.log("Recent circulation uses one responsive representation; protected dashboard routes and data loading remain present.");
