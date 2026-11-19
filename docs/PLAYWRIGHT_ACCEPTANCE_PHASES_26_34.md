# SNCBT Library E2E Acceptance Testing — Phases 26–34

This suite is the browser-level release gate for the SNCBT Library Management System. It complements `npm test`; it does not replace unit/Nuxt tests. The acceptance project is **Vitest + Playwright Core**: Vitest is the test runner and `playwright-core` drives Chromium, Firefox, and WebKit.

## Phase coverage

- **Phase 26 — Foundation:** direct `playwright-core` browser automation against a running Nuxt + Strapi pair, environment loading, role credentials, runtime guard, protected-route manifest, safe UI-control audit, write safety.
- **Phase 27 — Authentication/Entry:** sign-in UI, invalid credentials, protected-route redirect, public Student Registration validation, and the protected Faculty Access compatibility redirect.
- **Phase 28 — Student:** route sweep, Books search, Reservation modal, Security validation, console/network guard.
- **Phase 29 — Librarian:** route sweep, Students membership-term regression, Book Registration validation, Excel-template download, Membership Term refresh, circulation transaction in write mode.
- **Phase 30 — Faculty:** route sweep, shared Books search, Reports refresh.
- **Phase 31 — Administrator:** route sweep, Add User modal, Library Settings reload, Create Librarian validation.
- **Phase 32 — Negative/Error states:** controlled 400/401/403/404/409/422/500 behavior without exposing raw backend internals.
- **Phase 33 — Cross-browser/Responsive:** Chromium, Firefox, WebKit; 360, 390, 768, and 1440 pixel widths.
- **Phase 34 — Transaction/Release gate:** write-gated Student Reservation create/cancel and Librarian Borrow/Return, plus strict route fixtures and cross-browser release execution.

## One-time setup

Copy the template and fill only dedicated test accounts/fixtures:

```cmd
copy .env.e2e.example .env.e2e.local
npm ci
npm run test:browsers:install
```

Run Nuxt at `http://localhost:3000` and Strapi at `http://localhost:1337` before acceptance tests.


## Which command should I use?

Use the project npm scripts. The shorthand read-only localhost command is:

```cmd
npm run test:acceptance
```

It delegates to `npm run test:acceptance:local`. These are real project commands defined in `package.json`.

**Do not run `npx playwright test` for this project.** The Phase 26–34 acceptance files import Vitest APIs and are registered as the Vitest project named `acceptance`; they are not `@playwright/test` test files. Running the Playwright Test CLI against them can load the wrong runner context and produce errors such as `Cannot read properties of undefined (reading 'config')` or `Vitest failed to find the current suite`.

The execution path is:

```text
npm script -> run-library-acceptance.mjs -> Vitest acceptance project -> playwright-core -> browser
```

## Localhost commands

Read-only Chromium acceptance (either command is valid):

```cmd
npm run test:acceptance
```

```cmd
npm run test:acceptance:local
```

Write-gated transactions on a disposable/local test database:

```cmd
npm run test:acceptance:local:write
```

Read-only browser matrix:

```cmd
npm run test:acceptance:cross-browser
```

Strict local release gate (all role credentials, dynamic fixtures, and write fixtures required):

```cmd
npm run test:acceptance:release:local
```

## Staging gate

Create `.env.e2e.staging` with the staging URLs and dedicated staging accounts. Remote writes require both:

```text
E2E_ALLOW_REMOTE_WRITES=true
E2E_REMOTE_WRITE_CONFIRMATION=I_UNDERSTAND_THIS_MUTATES_TEST_DATA
```

Then run:

```cmd
npm run test:acceptance:staging
```

Never point write-enabled acceptance tests at production. The runner rejects an explicit production target and remote writes are disabled unless separately confirmed.

## Strict fixtures

Strict/release execution requires:

- Administrator, Librarian, Student, and Faculty test credentials
- `E2E_BOOK_DOCUMENT_ID` for Student/Faculty Book Detail
- `E2E_BOOK_ID` for Librarian Book Detail/Edit
- `E2E_ADMIN_USER_ID` and `E2E_ADMIN_ROLE_ID` for Admin detail pages
- `E2E_STUDENT_BARCODE` for a dedicated active Student
- `E2E_AVAILABLE_BOOK_BARCODE` for an Available disposable test copy
- `E2E_RESERVATION_BOOK_QUERY` for a reservable test title

The Borrow/Return test is intentionally transactional: the same test borrows the configured copy and returns it before completion. A cleanup warning is printed if the borrow succeeded but return did not.

## Runtime failure policy

Acceptance tests fail on:

- uncaught page errors
- browser console errors
- non-aborted failed network requests
- unexpected backend 4xx/5xx responses
- frontend 5xx responses
- protected pages missing from the route manifest
- unnamed visible buttons or broken visible links in route sweeps
- horizontal overflow at release viewports

Expected negative-test HTTP errors are explicitly allow-listed per test instead of globally ignored.


## Coverage-gate wording

`npm run verify:acceptance:coverage` checks that the protected page source inventory and entry-route definitions are represented in the acceptance route manifest. It does **not** navigate those routes and does not mean that 63 protected pages have already passed browser execution. Browser execution starts only when an acceptance command launches the Vitest `acceptance` project.

The current route classification is:

- `/` — public sign-in route
- `/student-registration` — public registration route
- `/faculty-access` — protected compatibility entry that redirects through `/faculty/dashboard`; it is not a public faculty registration/sign-in page

## Hydration and protected hard-load behavior

Acceptance navigation now waits until Nuxt reports that client hydration has completed before clicking or submitting SSR-rendered controls. This prevents false failures where Playwright can see server-rendered form elements before Vue has attached their event handlers.

For protected hard-loads, the global auth middleware checks the privacy-safe `auth-session-hint` during SSR. Requests with no session hint are redirected to sign-in before a protected portal layout is rendered. The `/faculty-access` compatibility entry is normalized to `/faculty/dashboard` first so its existing redirect semantics are preserved.

Authenticated portal layouts also call `auth.initialize()` before starting monitoring, notification polling, or Faculty sidebar data work. Librarian and Student notification polling is role-gated as a secondary safeguard against transient unauthenticated API calls.

## Interactive-control audit correction (2026-09-16)

The generic control audit checks keyboard reachability from the rendered control state (`tabIndex`, `inert`, and ARIA visibility) instead of forcing each Nuxt UI control to become the exact `document.activeElement`. Functional clicks/submissions remain covered by their dedicated workflow tests. See `docs/PHASE_26_34_FOCUS_AUDIT_CORRECTION.md`.

## Authenticated read-only completion gate

After the public/default acceptance run is clean, configure `.env.e2e.local` with dedicated Administrator, Librarian, Student, and Faculty test accounts plus the four dynamic-route fixture IDs. Then run:

```cmd
npm run test:acceptance:authenticated
```

This mode is intentionally non-mutating (`E2E_ALLOW_WRITES=false`). It fails fast when any required role credential or dynamic-route fixture is missing instead of silently skipping authenticated coverage. With all values configured, the target is **36 executed read-only tests and 2 intentionally skipped Phase 34 write tests**.

Required authenticated read-only values:

- `E2E_ADMIN_USERNAME`, `E2E_ADMIN_PASSWORD`
- `E2E_LIBRARIAN_USERNAME`, `E2E_LIBRARIAN_PASSWORD`
- `E2E_STUDENT_USERNAME`, `E2E_STUDENT_PASSWORD`
- `E2E_FACULTY_USERNAME`, `E2E_FACULTY_PASSWORD`
- `E2E_BOOK_DOCUMENT_ID`, `E2E_BOOK_ID`
- `E2E_ADMIN_USER_ID`, `E2E_ADMIN_ROLE_ID`

### Authenticated setup helper

You only need to fill the four username/password pairs manually. With the local Strapi backend running, execute:

```cmd
npm run setup:acceptance:authenticated
```

The helper signs in to each account, verifies that the real role matches the configured E2E slot, discovers a readable published Book `documentId`, derives the Administrator user/role IDs, writes the four dynamic-route fixture values into `.env.e2e.local`, and enforces `E2E_ALLOW_WRITES=false`. Passwords and JWTs are never printed. The helper performs no create/update/delete operations.

You can verify the helper's isolated contract with:

```cmd
npm run verify:acceptance:setup-helper
```

The three transaction-only fixture values (`E2E_STUDENT_BARCODE`, `E2E_AVAILABLE_BOOK_BARCODE`, `E2E_RESERVATION_BOOK_QUERY`) are not required until write/release testing.

