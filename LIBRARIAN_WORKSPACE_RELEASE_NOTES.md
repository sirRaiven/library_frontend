# Librarian workspace layout

| Page | Default view | Records view |
| --- | --- | --- |
| Library Visits | Record Time-In, with the latest scan confirmation | Visit Records with attendance totals, date and member filters, search, and pagination |
| Borrow Books | Checkout, with the scanner followed by borrower verification and checkout review | Borrowing Records with search, date filters, pagination, and due dates |
| Return Books | Process Returns, with member lookup and physical-copy verification | Return Records for today, with a date range or All dates, search, pagination, and assessed fines |
| Membership Renewal | Renew Membership, with card lookup and a renewal checklist | Membership History with totals, academic year, semester and status filters, search, and pagination |

Tabs keep the current work in progress and record filters while the page stays open. The work view opens by default. To link to a records view, add `?view=records` to that page’s URL. Use arrow keys to move between tabs and Enter or Space to open the focused tab.

Export report remains in each page header. Its report and format choices follow the page. For reports with a date range, confirm the range in the export dialog.

Apply both the frontend and backend source from this release and restart both services. The backend now reads one page at a time for Librarian borrowing and return history. It uses the existing data and authentication. Keep your current environment configuration and database.
