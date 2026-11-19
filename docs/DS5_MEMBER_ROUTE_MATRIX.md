# DS-5 — Student & Faculty Experience Route Matrix

Wave DS-5 migrates every Student and Faculty portal route onto the SNCBT Library Design System v2 member-experience contract. The scope is route-complete: it includes direct book-detail routes and redirect entry routes, not only destinations shown in mobile navigation.

## Student Portal

| Route | Source | DS-5 treatment |
|---|---|---|
| `/student` | `app/pages/student/index.vue` | Compatibility redirect preserved; no standalone UI. |
| `/student/dashboard` | `app/pages/student/dashboard.vue` | Member-page contract, two-column phone metrics, mobile duplicate quick-actions reduced. |
| `/student/books` | `app/pages/student/books/index.vue` | Search-first progressive filters and compact phone book cards. |
| `/student/books/:documentId` | `app/pages/student/books/[documentId].vue` | Compact phone cover/detail presentation and two-column summary metrics. |
| `/student/borrowings` | `app/pages/student/borrowings.vue` | Progressive search/sort controls, two-column phone metrics, compact borrowing records. |
| `/student/reservations` | `app/pages/student/reservations.vue` | Two-column phone metrics, compact reservation records, safe bottom spacing. |
| `/student/history` | `app/pages/student/history.vue` | Progressive filters and safe pagination/content clearance. |
| `/student/library-card` | `app/pages/student/library-card.vue` | Redundant view-only messaging reduced; renewal requirements shown only when required. |
| `/student/notifications` | `app/pages/student/notifications.vue` | Progressive notification filters, two-column phone metrics, automatic-update context consolidated. |
| `/student/security` | `app/pages/student/security.vue` | Member-page mobile density and two-column security metrics; existing security workflows preserved. |

## Faculty Portal

| Route | Source | DS-5 treatment |
|---|---|---|
| `/faculty` | `app/pages/faculty/index.vue` | Compatibility redirect preserved; no standalone UI. |
| `/faculty/dashboard` | `app/pages/faculty/dashboard.vue` | Two-column phone metrics; duplicate mobile navigation actions reduced. |
| `/faculty/books` | `app/pages/faculty/books/index.vue` | Search-first progressive filters and shared compact phone book cards. |
| `/faculty/books/:documentId` | `app/pages/faculty/books/[documentId].vue` | Compact phone cover/detail presentation. |
| `/faculty/borrowings` | `app/pages/faculty/borrowings.vue` | Progressive filters, two-column phone metrics, compact mobile borrowing presentation. |
| `/faculty/reports` | `app/pages/faculty/reports.vue` | Progressive report filters and existing report workflow retained. |
| `/faculty/profile` | `app/pages/faculty/profile.vue` | Shared form section and bottom-nav-aware sticky form actions. |

## Protected behavior

DS-5 is a presentation/interaction migration. It must preserve:

- Student and Faculty authentication and role middleware.
- All existing API/composable calls and request parameters.
- Student reservation creation/cancellation.
- Student profile/contact and password/session/device actions.
- Student notification read/refresh operations.
- Student library-card view-only protections.
- Faculty borrowing-status/report submission.
- Faculty profile save behavior.
- Book detail and collection routes.
- DS-4 mobile bottom-navigation clearance and iOS safe-area behavior.

## Mobile experience contract

- 320px remains the minimum supported viewport.
- Student/Faculty bottom navigation remains the primary phone navigation.
- Search remains immediately visible; secondary filters move behind `Filters` on phones.
- Summary metrics use two columns on phones where card content remains understandable.
- Decorative book covers no longer dominate collection cards on phones; full cover treatment remains on larger screens.
- Page-level bottom-margin hacks are not used to avoid the fixed navigation; the shared shell owns bottom clearance.
- Member routes use `.sncbt-member-page` so common density, touch, and overflow rules apply consistently.
