import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const fail = (message) => { console.error(`[ui-ux] ${message}`); process.exitCode = 1; };
const expect = (condition, message) => { if (!condition) fail(message); };

const librarian = read("app/layouts/librarian.vue");
const css = read("app/assets/css/main.css");
const nuxt = read("nuxt.config.ts");
const dashboard = read("app/pages/librarian/dashboard.vue");
const books = read("app/pages/librarian/books/index.vue");

expect(nuxt.includes('modules: ["@nuxt/ui", "@nuxt/content"]'), "Nuxt Content compatibility module must remain enabled while UContentNavigation is in use.");
expect(!css.match(/sncbt-sidebar-surface[\s\S]{0,300}backdrop-filter:\s*blur\(18px\)/), "Sidebar still uses expensive full-surface blur.");
expect(librarian.includes('librarian-content-navigation:${route.path}'), "Expanded Librarian navigation must refresh its active/open state after route changes.");
expect(librarian.includes(':default-open="true"'), "Expanded Librarian navigation groups must remain visible and discoverable.");
expect(librarian.includes('class="hidden lg:inline-flex"'), "Desktop collapse control is not hidden from mobile.");

for (const route of [
  "/librarian/dashboard", "/librarian/visits", "/librarian/borrow", "/librarian/return",
  "/librarian/fines", "/librarian/reservations", "/librarian/books", "/librarian/books/register",
  "/librarian/students", "/librarian/faculty", "/librarian/memberships", "/librarian/reports",
  "/librarian/history", "/librarian/faculty-book-reports", "/librarian/membership-term",
  "/librarian/library-card-designer",
]) {
  expect(librarian.includes(route), `Navigation route missing after modernization: ${route}`);
}
expect(librarian.includes('/librarian/notifications'), "Notification route must remain reachable from navigation and account actions.");
expect(librarian.includes('getCompactChildItems'), "Collapsed Librarian navigation must expose grouped child routes through menus.");
expect(librarian.includes('aria-haspopup="menu"'), "Collapsed Librarian group controls must expose menu semantics.");
expect(dashboard.includes('/librarian/visits'), "Dashboard Scan Entry workflow missing.");
expect(dashboard.includes('/librarian/borrow'), "Dashboard Borrow workflow missing.");
expect(dashboard.includes('/librarian/return'), "Dashboard Return workflow missing.");
expect(dashboard.includes('/librarian/books/register'), "Dashboard Add Book workflow missing.");
expect(books.includes('LiveBarcodeScanner'), "Book collection camera scanner was removed.");
expect(books.includes('collectionActionItems'), "Book collection secondary actions are not preserved.");
expect(books.includes('/librarian/books/import'), "Book import action was lost.");
expect(books.includes('/librarian/books/copies'), "Physical Copies action was lost.");
expect(books.includes('exportInventory'), "Inventory export action was lost.");

if (!process.exitCode) console.log("UI/UX modernization verification passed.");
