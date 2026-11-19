# DS-8.2 — Librarian Dashboard Refinement

DS-8.2 refines only the Librarian Dashboard layout on top of DS-8.1.

## Goals

- Keep the DS-8 mint/emerald and navy/teal visual language.
- Preserve the permanent dark navigation shell from DS-8.1.
- Reduce visual duplication and excessive vertical space in Recent Circulation.
- Keep common circulation tasks prominent.
- Keep attention items easy to scan.
- Preserve all dashboard data loading, routes, permissions, and business logic.

## Layout

1. Operational welcome header with date, last refresh time, and Refresh action.
2. Four compact Library summary metrics.
3. Circulation Desk for Scan Entry, Borrow, Return, and Add Book.
4. Priority Queue for reservations, overdue loans, and unread notifications.
5. One responsive Recent Circulation list for both mobile and desktop.

The former separate mobile-card and desktop-table representations of Recent Borrowing were removed from the Dashboard. This prevents duplicate rendering when utility/display styles conflict and keeps the page substantially shorter.

No `<script setup>` logic in `app/pages/librarian/dashboard.vue` was changed.
