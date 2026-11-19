# Library Playwright Acceptance Phases 26–34 Design

## Goal
Provide repeatable localhost and staging browser acceptance testing for every protected portal route, representative safe UI controls, critical forms, error states, responsive layouts, and the highest-risk write workflows before cloud deployment.

## Architecture
Keep the existing Vitest + Nuxt Test Utils browser smoke tests unchanged. Add a separate `acceptance` Vitest project that launches `playwright-core` directly against already-running Nuxt and Strapi servers. A platform-neutral Node runner loads `.env.e2e.local` or `.env.e2e.staging`, performs connectivity/write-safety checks, and runs Chromium/Firefox/WebKit as requested.

The acceptance layer is read-only by default. Mutating scenarios require `E2E_ALLOW_WRITES=true`; remote writes additionally require an explicit remote-write flag and confirmation phrase. Strict release mode requires all role accounts and dynamic/transaction fixtures.

## Coverage model
Every protected page is represented in a source-controlled route manifest enforced by a unit contract. Each route is loaded under its real role, audited for accessible interactive controls, and safe search/refresh controls are exercised. Dedicated suites cover role-specific forms and workflows. Destructive or persistent behavior is tested only in explicit write-gated tests with cleanup/return behavior.

## Failure policy
Fail on uncaught page errors, console errors, unexpected request failures, backend 4xx/5xx, frontend 5xx, broken links, unnamed buttons, route drift, and responsive overflow. Expected negative-test HTTP statuses must be locally allow-listed.
