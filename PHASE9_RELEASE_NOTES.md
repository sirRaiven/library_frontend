# Phase 9 — Performance and Application Optimization

The SNCBT Library Management System update builds on Phase 4.

## Changes

- Resized the institutional and Library logos while keeping their PNG transparency and URLs. The institutional logo is used in reports and Library cards. The Library logo is used on sign-in, portal navigation, and exports.
- The Librarian, Student, and Faculty collections load book records and filter options concurrently. The Faculty sidebar fetches its profile summary in the background without changing the active page's loading and error state.
- Reports and inventory use one browser ExcelJS bundle, loaded on demand. Inventory validation reuses the same lookup sets across workbook rows. Inventory export writes the Book Category column so the workbook can be read by the import page.

## Verification and rollout

Run `npm ci` in `library_frontend` to install its updated lockfile while keeping your environment settings. Restart the development server, or rebuild and restart the frontend for a compiled deployment.

The benchmarks use local production Nuxt builds with simulated Strapi responses. Live LAN latency, database workload, and print output on physical cards remain to be checked at deployment.

## Local benchmark results

| Measurement | Phase 4 | Phase 9 |
|---|---:|---:|
| Library logo response bytes | 440,725 | 109,705 |
| Institutional logo bytes | 5,273,437 | 598,982 |
| All emitted client JavaScript bytes | 5,809,711 | 4,760,321 |
| All emitted client JavaScript bytes, gzipped individually | 1,618,057 | 1,378,339 |
| Librarian first catalog result visible | 2,507 ms | 653 ms |
| Student first catalog result visible | 2,371 ms | 561 ms |
| Faculty first catalog result visible | 2,129 ms | 553 ms |

Each browser run used a fresh context. The catalog fixture delayed filter options by 1,350 ms and book results by 100 ms. Client JavaScript totals include async chunks.

Nuxt typecheck, production build, lockfile validation, and the production security check passed. Eight Chromium scenarios passed. The downloaded Administrator report and Librarian inventory workbooks contained the expected data. The exported inventory passed the import preview with the category present. No inventory records were written during verification.

Next in the approved order is Phase 7, Library Operations and Business Rules Verification.
