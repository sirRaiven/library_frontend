# SNCBT Library Management System — Deployment Runbook

1. Freeze feature changes and tag the approved source revision.
2. Back up PostgreSQL and uploads; verify the backup.
3. Complete the UAT checklist and resolve all release-blocking failures.
4. Run frontend `npm run release:verify`.
5. Run frontend `npm run build:production` using the production frontend environment.
6. Run backend `npm run typecheck`, `npm run build`, `npm run verify:cors`, and `npm run verify:production`.
7. Confirm production bootstrap flags are disabled after permissions are provisioned.
8. Deploy Strapi behind the trusted reverse proxy and PostgreSQL least-privilege account.
9. Deploy Nuxt on HTTPS; prefer same-origin `/api` and `/uploads` reverse proxying.
10. Verify login/refresh/logout, each role home route, Maintenance Mode, reports, barcode scanning, and downloads.
11. Verify security headers and Secure/HttpOnly refresh cookie from the browser.
12. Record release version, deployment time, backup reference, verifier results and rollback owner.
13. Keep the pre-deployment backup until the release has passed the agreed observation period.

Rollback: enable Maintenance Mode if needed, stop writes, restore the previous application revision, and restore data only when a data migration/change requires it. Do not restore an older database merely to roll back frontend code.

## Phase 35–36 compatibility gate

Before release:

1. Run `npm run phase35:cross-browser` against the local authenticated read-only environment.
2. Run `npm run release:phase36` with the intended production frontend environment.
3. Run backend `npm run release:check` with the intended production backend environment.
4. On staging, run `npm run phase36:staging`.
5. After live deployment, run `npm run verify:deployment:production`, then `npm run test:acceptance:production:chromium`; run the full `npm run test:acceptance:production` before final sign-off where the verification accounts are permitted.
6. Do not run transaction/write acceptance against staging or production. Localhost is the only supported write target.
