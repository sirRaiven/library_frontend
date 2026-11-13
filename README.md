# SNCBT Library Management System — Frontend

Nuxt 4 / Vue 3 web portal for administrators, librarians, students, and faculty. Source-only cleanup baseline: **13 November 2026**.

## Setup

1. Install **Node.js 22+** and npm 10+.
2. Copy `.env.example` to `.env` and configure `NUXT_PUBLIC_STRAPI_URL`. Do not commit real secrets.
3. Run `npm ci` to restore locked dependencies and prepare the barcode scanner WASM.
4. Run `npm run dev` and open `http://localhost:3000`.

The backend should be running and accessible at the configured Strapi origin.

## Validation and build

- `npm run typecheck` — Nuxt TypeScript check.
- `npm run build` — builds the application and regenerates barcode WASM.
- `npm run check` — typecheck and build.
- `npm run verify:security` — existing static production security checks.
- `npm run build:production` — verifies a production environment and builds.

## Test suite

The old unit, E2E, acceptance and release contract suites were **intentionally reset**; no `npm test` command is advertised until a new suite exists. See `TEST_RESET.md`.

## Repository hygiene

Generated `.nuxt`, `.output`, `.data`, `public/barcode/*.wasm`, local environment files and runtime caches are deliberately excluded. Nuxt will regenerate these on install/build.

This cleanup is not a claim that Phase 6.1 or production acceptance has passed. The source should be checked and tested in a fully provisioned development environment.
