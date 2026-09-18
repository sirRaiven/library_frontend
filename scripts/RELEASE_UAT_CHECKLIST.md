# SNCBT Library Management System — Final UAT Checklist

Use a dedicated UAT database and non-production test accounts. Record Pass/Fail, tester, date, and evidence for every item.

## Student
- Sign in/out and session refresh.
- Registration/approval and membership/card visibility.
- Browse/search books and see copy availability.
- Create/cancel reservation under normal mode.
- View active borrowing, history, fines, notifications, profile, and security pages.
- Confirm blocked/inactive membership protections.

## Faculty
- First protected request links or provisions an unambiguous Faculty profile.
- Browse books and view borrowings/reports.
- Submit accountability status and verify Librarian review workflow.
- Lost/replacement workflow preserves the original copy as Lost.

## Librarian
- Dashboard, catalog/copies, Students/Faculty, membership, visits.
- Reservation approval, borrow, return, fines/OR payment, cards, notifications, history, reports.
- Duplicate Official Receipt number is rejected and payment remains unpaid.
- Camera/barcode workflows work on a real secure-context mobile device.

## Administrator
- Dashboard, Users, Librarians, Account Review, Roles & Permissions.
- Library Operations and unified Reports (Library + Monitoring).
- Activity Log, Sessions, Devices, Audit Trail and integrity verification.
- System & Maintenance health checks and Maintenance Mode.

## Maintenance Mode
- Student, Faculty and Librarian GET/read actions remain available.
- Their create/update/delete actions are blocked server-side with 503.
- Auth login/refresh/logout still work.
- Admin functions remain available.
- Maintenance banner appears on all non-Admin portals.

## Browser/device
- Chromium, Firefox and WebKit automated suites pass.
- Android Chrome and iPhone Safari: login, navigation, barcode scanner, cookies, reports/downloads.
- 360/390/430/768/1024/1280px layouts have no blocking overflow.
- Keyboard focus and primary workflows remain usable without a mouse.

## Release evidence
- Frontend release verification passes.
- Backend typecheck/build/CORS/production readiness checks pass.
- PostgreSQL backup completes and verifies.
- A backup is restored into an isolated database and sampled records/files are verified.
- Production HTTPS/reverse proxy and secure cookies are verified from a real client.
