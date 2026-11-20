# Librarian reports from each page

Open the Librarian page for the work you are doing and choose **Export report**. Pick a report, select the relevant dates or academic term when offered, and download PDF, Excel, or Word.

| Librarian pages | Report choices |
|---|---|
| Dashboard, Collection, Physical Copies, and book registration | Library overview, circulation, collection summaries, physical inventory, and most borrowed books |
| Book Record and Edit Book | The book's physical copies or saved bibliographic details |
| Inventory Import and print previews | Import results, barcode label lists, or Library Card print lists |
| Borrow, Return, History, and Reservations | Registers, daily summaries, outstanding loans, or member activity |
| Visits | Visitor logs and daily visitor totals |
| Fines and Payments | Fines and payment records, or the calendar visible on its tab |
| Students, Faculty, and Library Cards | Member registers, academic term membership totals, and member activity |
| Student Record, Faculty Book Reports, Approvals, and Notifications | The records on the current page |
| Academic Term, Library Card Designer, and Registration QR | Saved term validity, saved card design summary, and registration totals |

The report header contains the Library logo, St. Nicolas College of Business and Technology, Library Department, and the report name and date. Column selections retain the date, status, totals, and identifiers needed for each report. The export dialog describes the scope, such as the selected period, current page, or current print queue.

Bookmarks to the former Librarian Reports page open the Librarian dashboard. Librarian collection actions include a **Download Inventory Workbook** option for the existing import-compatible sheet. The Administrator reporting workspace remains available through the Administrator portal.

## Apply the update

Use the supplied source with your working environment files, database, and uploaded media. Restart the frontend development server or rebuild the frontend for deployment. Both source archives were used for the application baseline, with the Phase 7 source-only release layout.

## Verification

The Nuxt typecheck, production build, and production security check passed. Chromium opened the export control on all 25 Librarian pages, verified the old bookmark redirect, and downloaded sample PDF, Excel, and Word files. The sample files contained the expected report rows and embedded logo. A barcode print-list export was also verified. The standard report definitions were checked against Strapi and a disposable PostgreSQL database.
