# DS-4 Staff Route Matrix

All Administrator and Librarian routes are included in the DS-4 migration scope. Sidebar visibility is not used as a completion criterion.

| Portal | Route | Source | DS-4 treatment |
|---|---|---|---|
| Admin | `/admin/accounts-review` | `admin/accounts-review.vue` | Responsive record cards + desktop table |
| Admin | `/admin/activity` | `admin/activity.vue` | Responsive record cards + desktop table |
| Admin | `/admin/audit-logs` | `admin/audit-logs.vue` | Responsive record cards + desktop table |
| Admin | `/admin/dashboard` | `admin/dashboard.vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/devices` | `admin/devices.vue` | Responsive record cards + desktop table |
| Admin | `/admin` | `admin/index.vue` | Redirect compatibility |
| Admin | `/admin/librarians/create` | `admin/librarians/create.vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/librarians` | `admin/librarians/index.vue` | Responsive record cards + desktop table |
| Admin | `/admin/monitoring-reports` | `admin/monitoring-reports.vue` | Redirect compatibility |
| Admin | `/admin/operations` | `admin/operations.vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/reports` | `admin/reports.vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/roles/[id]` | `admin/roles/[id].vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/roles` | `admin/roles/index.vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/sessions` | `admin/sessions.vue` | Responsive record cards + desktop table |
| Admin | `/admin/settings` | `admin/settings.vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/system-health` | `admin/system-health.vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/users/[id]/activity` | `admin/users/[id]/activity.vue` | Responsive record cards + desktop table |
| Admin | `/admin/users/[id]/devices` | `admin/users/[id]/devices.vue` | Responsive record cards + desktop table |
| Admin | `/admin/users/[id]/sessions` | `admin/users/[id]/sessions.vue` | Responsive record cards + desktop table |
| Admin | `/admin/users/[id]` | `admin/users/[id].vue` | DS-4 staff page scope + responsive shell |
| Admin | `/admin/users` | `admin/users/index.vue` | Responsive record cards + desktop table |
| Librarian | `/librarian/books/[id]/edit` | `librarian/books/[id]/edit.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/books/[id]` | `librarian/books/[id]/index.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/books/copies` | `librarian/books/copies.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/books/import` | `librarian/books/import.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/books` | `librarian/books/index.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/books/print` | `librarian/books/print.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/books/register` | `librarian/books/register.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/borrow` | `librarian/borrow.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/dashboard` | `librarian/dashboard.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/faculty-book-reports` | `librarian/faculty-book-reports.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/faculty` | `librarian/faculty.vue` | Responsive record cards + desktop table |
| Librarian | `/librarian/fines` | `librarian/fines.vue` | Responsive record cards + desktop table |
| Librarian | `/librarian/history` | `librarian/history.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/library-card-designer` | `librarian/library-card-designer.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/library-card-print` | `librarian/library-card-print.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/membership-term` | `librarian/membership-term.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/memberships` | `librarian/memberships.vue` | Responsive record cards + desktop table |
| Librarian | `/librarian/notifications` | `librarian/notifications.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/reports` | `librarian/reports.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/reservations` | `librarian/reservations.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/return` | `librarian/return.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/student-registration-approvals` | `librarian/student-registration-approvals.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/student-self-registration` | `librarian/student-self-registration.vue` | DS-4 staff page scope + responsive shell |
| Librarian | `/librarian/students` | `librarian/students.vue` | Responsive record cards + desktop table |
| Librarian | `/librarian/visits` | `librarian/visits.vue` | Responsive record cards + desktop table |

## Protected behavior

DS-4 changes page templates/styles only. Page `<script setup>` sections are preserved from the DS-3 baseline. Existing API calls, permissions, route destinations, scanners, mutations, validation, and print behavior remain protected by source-contract checks.
