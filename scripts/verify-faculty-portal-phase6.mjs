import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const requireText = (file, text, message) => {
  if (!read(file).includes(text)) failures.push(`${file}: ${message}`);
};

const dashboard = "app/pages/faculty/dashboard.vue";
requireText(dashboard, "/faculty/borrowings?attention=due-soon", "Due-soon metric must open the targeted borrowing view.");
requireText(dashboard, "/faculty/borrowings?attention=lost", "Replacement metric must open lost Faculty books.");
requireText(dashboard, "/faculty/reports?status=open", "Open reports metric must open the open-review report view.");
requireText(dashboard, "Faculty action center", "Faculty tasks must not be presented as a notification center.");

const borrowings = "app/pages/faculty/borrowings.vue";
requireText(borrowings, 'queryChoice("attention"', "Borrowings must honor attention deep links.");
requireText(borrowings, 'aria-label="Borrowing attention filter"', "Borrowing attention filter needs an accessible name.");
requireText(borrowings, 'aria-label="Search Faculty borrowing records"', "Borrowing search needs an accessible name.");
requireText(borrowings, 'aria-live="polite"', "Borrowing result changes need a polite announcement.");
requireText(borrowings, "View book details for", "Borrowing cards must link back to Faculty book details.");
const currentCountUses = (read(borrowings).match(/portal\.summary\.value\.currentCount/g) ?? []).length;
if (currentCountUses !== 1) failures.push(`${borrowings}: Current Books metric must render exactly one count value.`);

const reports = "app/pages/faculty/reports.vue";
requireText(reports, '{ label: "Open Review", value: "open" }', "Reports need an Open Review filter.");
requireText(reports, "syncRouteQuery", "Report filters must be preserved in the URL.");
requireText(reports, 'aria-label="Search Faculty book status reports"', "Report search needs an accessible name.");
requireText(reports, 'aria-live="polite"', "Report result changes need a polite announcement.");
requireText(reports, "View book details for", "Reports must link back to Faculty book details.");

const books = "app/pages/faculty/books/index.vue";
requireText(books, 'queryText("search"', "Faculty catalog must initialize search from the URL.");
requireText(books, "syncRouteQuery", "Faculty catalog filter state must be preserved in the URL.");
requireText(books, 'aria-label="Search Faculty book collection"', "Faculty catalog search needs an accessible name.");
requireText(books, 'aria-live="polite"', "Faculty catalog results need a polite announcement.");

const composable = "app/composables/useFacultyPortal.ts";
requireText(composable, 'attention?: "all" | "due-soon" | "lost" | "overdue"', "Faculty API client must send targeted borrowing attention filters.");
requireText(composable, 'sort?: "newest" | "oldest"', "Faculty report API client must support report sorting.");

if (failures.length) {
  console.error("Phase 6 Faculty portal verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Phase 6 Faculty portal verification passed.");
