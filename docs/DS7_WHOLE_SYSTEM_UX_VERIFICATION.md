# DS-7 — Whole-System UX, Responsive & Interaction Verification

Wave DS-7 closes the Design System v2 migration with a **67-route inventory** and a whole-application verification contract. It does not introduce new Library business rules. Its purpose is to confirm that the UI established in DS-1 through DS-6 remains usable across routes, viewport classes, themes, input methods, and specialist boundaries.

## Verification matrix

Every rendered route should be exercised at representative widths, not only resized once on a desktop browser:

| Class | Width | Primary concerns |
|---|---:|---|
| Narrow phone | **320 px** | No page-level horizontal overflow, action labels remain reachable, dialogs fit, final content clears fixed navigation. |
| Common phone | **390 px** | Normal phone density, bottom navigation, filter disclosure, card hierarchy, keyboard/touch controls. |
| Tablet | **768 px** | Card/table transitions, two-column form decisions, navigation/drawer behavior, dialog sizing. |
| Laptop | **1024 px** | Sidebar transitions, workflow columns, tables, filters, no premature cramped split layouts. |
| Desktop | **1440 px** | Full hierarchy, wide data presentation, specialist side panels, efficient information density. |

Verification applies in **Light and dark** themes. Interactive routes must be checked with **Touch and keyboard** input. Specialist routes additionally require **Print and scanner boundaries** verification so exact physical output and camera/scanner surfaces remain independent from responsive screen layout.

## DS-7 source guardrails

- All 67 page files remain present: 22 Administrator, 25 Librarian, 10 Student, 7 Faculty, and 3 shared/public entries.
- 45 rendered Admin/Librarian views retain the staff responsive scope; 15 rendered Student/Faculty views retain the member scope.
- Student and Faculty layouts retain the real bottom-navigation flow spacer and scroll-padding protection verified on iPhone/Safari.
- Public Sign In and Student Registration receive the same viewport-containment rules even though they do not use an authenticated dashboard panel.
- Whole-viewport width utilities such as `w-screen`, `min-w-screen`, and brittle `100vw - ...` template calculations are rejected by the DS-7 verifier.
- Fixed-width tables are allowed only for the two known exact data matrices that are already inside internal horizontal scrollers: the Book Import preview and processed Return table.
- The Library Visits camera popover uses a dynamic-viewport-safe width, and the large Student Registration Approval dialog uses the shared viewport-safe modal contract.
- DS-7 does not change page-level API calls, permission checks, scanner mutations, circulation rules, registration rules, reports, or print-state transitions.

## 67-route inventory

| Route | Source | DS-7 verification focus |
|---|---|---|
| `/admin/accounts-review` | `app/pages/admin/accounts-review.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/activity` | `app/pages/admin/activity.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/audit-logs` | `app/pages/admin/audit-logs.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/dashboard` | `app/pages/admin/dashboard.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/data-management` | `app/pages/admin/data-management.vue` | Staff governance: managed/protected records, archive/restore lifecycle, dependency-aware destructive confirmation, responsive tables/cards. |
| `/admin/devices` | `app/pages/admin/devices.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin` | `app/pages/admin/index.vue` | Redirect integrity; destination remains reachable without duplicate UI. |
| `/admin/librarians/create` | `app/pages/admin/librarians/create.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/librarians` | `app/pages/admin/librarians/index.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/monitoring-reports` | `app/pages/admin/monitoring-reports.vue` | Redirect integrity; destination remains reachable without duplicate UI. |
| `/admin/operations` | `app/pages/admin/operations.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/reports` | `app/pages/admin/reports.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/roles/:id` | `app/pages/admin/roles/[id].vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/roles` | `app/pages/admin/roles/index.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/sessions` | `app/pages/admin/sessions.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/settings` | `app/pages/admin/settings.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/system-health` | `app/pages/admin/system-health.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/users/:id/activity` | `app/pages/admin/users/[id]/activity.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/users/:id/devices` | `app/pages/admin/users/[id]/devices.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/users/:id/sessions` | `app/pages/admin/users/[id]/sessions.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/users/:id` | `app/pages/admin/users/[id].vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/admin/users` | `app/pages/admin/users/index.vue` | Staff operations: responsive records/tables, dialogs, action reachability, keyboard/touch. |
| `/faculty/books/:documentId` | `app/pages/faculty/books/[documentId].vue` | Member mobile flow: bottom-nav clearance, reports/forms, compact records, action clarity. |
| `/faculty/books` | `app/pages/faculty/books/index.vue` | Member mobile flow: bottom-nav clearance, reports/forms, compact records, action clarity. |
| `/faculty/borrowings` | `app/pages/faculty/borrowings.vue` | Member mobile flow: bottom-nav clearance, reports/forms, compact records, action clarity. |
| `/faculty/dashboard` | `app/pages/faculty/dashboard.vue` | Member mobile flow: bottom-nav clearance, reports/forms, compact records, action clarity. |
| `/faculty` | `app/pages/faculty/index.vue` | Redirect integrity; destination remains reachable without duplicate UI. |
| `/faculty/profile` | `app/pages/faculty/profile.vue` | Member mobile flow: bottom-nav clearance, reports/forms, compact records, action clarity. |
| `/faculty/reports` | `app/pages/faculty/reports.vue` | Member mobile flow: bottom-nav clearance, reports/forms, compact records, action clarity. |
| `/faculty-access` | `app/pages/faculty-access.vue` | Redirect integrity; destination remains reachable without duplicate UI. |
| `/` | `app/pages/index.vue` | Public sign-in: short-screen scroll, light/dark, keyboard form, error/maintenance states. |
| `/librarian/books/:id/edit` | `app/pages/librarian/books/[id]/edit.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/books/:id` | `app/pages/librarian/books/[id]/index.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/books/copies` | `app/pages/librarian/books/copies.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/books/import` | `app/pages/librarian/books/import.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/books` | `app/pages/librarian/books/index.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/books/print` | `app/pages/librarian/books/print.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/books/register` | `app/pages/librarian/books/register.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/borrow` | `app/pages/librarian/borrow.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/dashboard` | `app/pages/librarian/dashboard.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/faculty-book-reports` | `app/pages/librarian/faculty-book-reports.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/faculty` | `app/pages/librarian/faculty.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/fines` | `app/pages/librarian/fines.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/history` | `app/pages/librarian/history.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/library-card-designer` | `app/pages/librarian/library-card-designer.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/library-card-print` | `app/pages/librarian/library-card-print.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/membership-term` | `app/pages/librarian/membership-term.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/memberships` | `app/pages/librarian/memberships.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/notifications` | `app/pages/librarian/notifications.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/reports` | `app/pages/librarian/reports.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/reservations` | `app/pages/librarian/reservations.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/return` | `app/pages/librarian/return.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/student-registration-approvals` | `app/pages/librarian/student-registration-approvals.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/student-self-registration` | `app/pages/librarian/student-self-registration.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/librarian/students` | `app/pages/librarian/students.vue` | Staff operations: responsive records/tables, filters, actions, long-content containment. |
| `/librarian/visits` | `app/pages/librarian/visits.vue` | Specialist workflow: task order, contained overflow, touch actions, scanner/print/report boundaries. |
| `/student/books/:documentId` | `app/pages/student/books/[documentId].vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student/books` | `app/pages/student/books/index.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student/borrowings` | `app/pages/student/borrowings.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student/dashboard` | `app/pages/student/dashboard.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student/history` | `app/pages/student/history.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student` | `app/pages/student/index.vue` | Redirect integrity; destination remains reachable without duplicate UI. |
| `/student/library-card` | `app/pages/student/library-card.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student/notifications` | `app/pages/student/notifications.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student/reservations` | `app/pages/student/reservations.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student/security` | `app/pages/student/security.vue` | Member mobile flow: bottom-nav clearance, compact records, filters, status/action clarity. |
| `/student-registration` | `app/pages/student-registration.vue` | Public registration: long-form reflow, photo editor, validation, dialogs, mobile completion. |


## Manual interaction checklist

For each applicable route, verify the following before closing the redesign:

1. **Viewport containment:** the browser page itself never scrolls sideways. Any wide report, spreadsheet, exact print preview, or desktop table scrolls only inside its designated data/preview region.
2. **Vertical completion:** the final card, pagination, empty state, form action, and alert can be scrolled fully above any fixed Student/Faculty bottom navigation and mobile browser chrome.
3. **Navigation:** drawer, sidebar, collapsed navigation, Student/Faculty bottom navigation, direct-entry routes, redirects, notifications, and account menus remain reachable.
4. **Actions:** primary actions stay obvious; secondary/destructive actions remain available through explicit buttons or overflow menus. Mobile redesign must not remove an operation available on desktop.
5. **Forms and dialogs:** labels, errors, dates, selects, textareas, confirmation dialogs, and long forms fit the viewport and remain keyboard reachable. Focus indicators remain visible.
6. **Data states:** loading, empty, error, populated, warning, overdue, blocked, archived, pending, active, and completed states remain distinguishable without relying on color alone.
7. **Light/dark:** text, borders, surfaces, badges, focus rings, scanner overlays, and modal contents retain usable contrast in both modes.
8. **Touch/keyboard:** coarse-pointer targets remain at least the shared touch target; tab/enter/escape behavior remains usable where the underlying Nuxt UI component supports it.
9. **Print/scanner:** screen responsiveness must not alter CODE128 payloads, A4/CR80 physical sizes, card print state, camera decoding, hardware-scanner submission, or scanner focus restoration.
10. **No duplicated instruction noise:** repeated descriptions, redundant quick-navigation blocks, or internal implementation wording should not return during later maintenance.

## Recommended final commands

```powershell
npm run verify:design-system
npm run verify:ui-ux
npm run verify:acceptance:coverage
npm run verify:security
npm run verify:compatibility
npm run verify:release-source
npm run test:unit
npm run test:nuxt
npm run typecheck
npm run build
```

For browser/device closure after the source gates pass, run the existing acceptance suites against a production build/preview and repeat the highest-risk routes on an actual phone, especially Student/Faculty bottom-navigation pages and Librarian scanner/print workflows.
