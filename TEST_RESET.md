# Test suite reset (13 November 2026)

The previous unit, Nuxt, browser, acceptance and E2E test suite has been removed intentionally for a fresh test design. The old suites were not carried forward and should not be considered passing or complete.

## Retained checks

- `npm run check` performs existing type/build and relevant static operational checks, when dependencies are installed.
- Production verification scripts are retained where they do not depend on the deleted test directories.

## New test suite roadmap

1. Install dependencies and prove clean boot/build with real (safe) local environment settings.
2. Design independent API unit/integration tests for critical library rules, permissions, accounts and data integrity.
3. Create new accessible browser E2E fixtures and safe isolated test accounts, using an empty or synthetic test database.
4. Verify borrowing, return, reservation, barcode/idempotency and audit flows with deliberate negative cases.
5. Run role-aware Student/Faculty/Librarian/Admin E2E flows, cross-browser and mobile.
6. Define a reproducible CI gate and publish an evidence-backed release checklist.

Do not use production credentials, real library records, uploaded identity photos, or an operational database for automated tests.

Original uploaded ZIPs retain the prior test suite for audit and rollback.
