# DS-6 — Specialist Workflow Matrix

Wave DS-6 focuses on high-interaction Library workflows that need more than ordinary page styling. These routes keep their existing APIs, permissions, mutations, validation, scanner logic, print output, and workflow state while receiving a task-first responsive treatment.

## Circulation and scanner workflows

| Route | Source | DS-6 treatment |
|---|---|---|
| `/librarian/borrow` | `app/pages/librarian/borrow.vue` | Scanner-first task layout, later two-column split, compact workflow steps, redundant scanner guidance removed, confirmation actions preserved. |
| `/librarian/return` | `app/pages/librarian/return.vue` | Scanner-first layout, internal verification workflow preserved, processed-return table becomes semantic mobile cards below tablet width. |
| `/librarian/visits` | `app/pages/librarian/visits.vue` | Scanner station and filter region standardized; camera/hardware/manual scanning remains unchanged. |
| `/librarian/reservations` | `app/pages/librarian/reservations.vue` | Specialist-page containment for reservation lookup/scanner actions and complex dialogs. |
| `/librarian/memberships` | `app/pages/librarian/memberships.vue` | Scanner-first renewal layout, safe card preview containment, renewal actions and term rules preserved. |

## Inventory intake and barcode production

| Route | Source | DS-6 treatment |
|---|---|---|
| `/librarian/books/register` | `app/pages/librarian/books/register.vue` | Single-column form until wide desktop, summary panel stops stealing width on laptops/tablets, registration actions retained. |
| `/librarian/books/import` | `app/pages/librarian/books/import.vue` | Upload/summary layout reflows later; spreadsheet previews use contained horizontal data regions instead of page overflow. |
| `/librarian/books/copies` | `app/pages/librarian/books/copies.vue` | Filter region and physical-copy cards normalized for touch and narrow screens; selection/print actions preserved. |
| `/librarian/books/print` | `app/pages/librarian/books/print.vue` | Phone-safe print toolbar and barcode-label grid; printed barcode dimensions and print CSS remain authoritative. |

## Library-card production

| Route | Source | DS-6 treatment |
|---|---|---|
| `/librarian/library-card-designer` | `app/pages/librarian/library-card-designer.vue` | Editor/preview split moves to very wide screens; preview remains readable on tablets/phones; save bar respects safe areas without large blur. |
| `/librarian/library-card-print` | `app/pages/librarian/library-card-print.vue` | Workflow/settings split moves to very wide screens; print actions stay reachable on phones; A4/CR80 print output remains unchanged. |

## Reporting and approvals

| Route | Source | DS-6 treatment |
|---|---|---|
| `/librarian/reports` | `app/pages/librarian/reports.vue` | Combined-report builder stops narrowing normal laptop layouts; report tables remain internally scrollable; export/print actions preserved. |
| `/librarian/faculty-book-reports` | `app/pages/librarian/faculty-book-reports.vue` | Specialist-page overflow and touch contract applied without changing report-status behavior. |
| `/librarian/student-registration-approvals` | `app/pages/librarian/student-registration-approvals.vue` | Desktop table retained; phones receive request cards with the same View/Approve/Reject/Reset/Print/status actions. Detail dialog uses phone-safe width. |
| `/librarian/student-self-registration` | `app/pages/librarian/student-self-registration.vue` | QR display/print workflow reflows later so the QR panel does not squeeze instructions on tablets. |

## Specialist mobile rules

- A scanner workflow must keep the scan field, camera entry, and manual/hardware flow immediately reachable.
- Large two-column task layouts do not activate until enough width exists for both columns without squeezing forms or scanner controls.
- Exact data matrices such as Excel import previews and generated report tables may use **internal** horizontal scrolling; they must never force page-level horizontal overflow.
- Operational tables that can be represented semantically must become mobile record cards instead of relying on horizontal table scrolling.
- Print preview routes may keep exact physical dimensions inside an internal preview scroller. Print CSS is never scaled merely to make the on-screen preview fit.
- Print/tool actions on phones remain in a horizontal, touch-safe toolbar rather than creating an excessive vertical button stack.
- Sticky or floating actions must respect `env(safe-area-inset-bottom)` and may not sit above the bottom edge by arbitrary desktop-oriented spacing.
- Specialist visual changes must not rewrite workflow state, API request parameters, database mutations, permissions, validation, barcode values, or print status transitions.

## Protected workflow contracts

DS-6 source verification explicitly protects the following behavior:

- Borrow: `handleCameraBarcodeDetected`, `confirmBorrowing`, member/copy scanner switching, cancellation.
- Return: member/copy camera scanning and `processSelectedReturns`.
- Visits: `handleCameraBarcode` and `recordTimeIn`.
- Membership renewal: camera lookup and renewal mutation.
- Reservations: scanner handlers and reservation status actions.
- Book registration: validation and `submitRegistration`.
- Excel import: parsing, `importInventory`, template download, and barcode-print handoff.
- Physical copies: `loadCopies` and `printCopies`.
- Barcode labels: CODE128 generation and `window.print()`.
- Library Card Designer: save/activate/import/export logic.
- Library Card Print: print-dialog gating plus Printed/Released status transitions.
- Reports: generation, combined reports, Print/PDF/Word/Excel exports.
- Student approvals: details, approval, rejection, credential reset, card printing/status workflow.
- Student registration QR: download and print actions.

