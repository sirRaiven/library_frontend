# Library Playwright Acceptance Phases 26–34 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, comprehensive Playwright acceptance layer for localhost and staging before SNCBT Library cloud deployment.

**Architecture:** Preserve existing unit/Nuxt/browser-smoke tests and add a direct `playwright-core` acceptance project against running Nuxt/Strapi. Use an exhaustive route manifest, runtime/network guard, role credentials, write gates, cross-browser execution, and strict release fixtures.

**Tech Stack:** Nuxt 4, Vue 3, Strapi 5 backend, Vitest 4, `@nuxt/test-utils`, `playwright-core` 1.61.x.

**Spec:** `docs/superpowers/specs/2026-09-16-library-playwright-acceptance-design.md`

## Global Constraints

- Read-only acceptance is the default.
- Local database writes require `E2E_ALLOW_WRITES=true`.
- Remote writes require `E2E_ALLOW_REMOTE_WRITES=true` and the exact confirmation phrase.
- No production credentials or secrets are committed.
- Existing `npm test` behavior remains unchanged.
- Every protected Vue page must be represented by the acceptance route manifest.

---

### Task 1: Acceptance foundation
- [x] Add environment parser and write-safety rules.
- [x] Add Playwright browser harness and role login helper.
- [x] Add console/page/network runtime guard.
- [x] Add complete protected-route manifest and UI audit helpers.
- [x] Add `acceptance` Vitest project and cross-platform runner.

### Task 2: Authentication and public workflows
- [x] Test sign-in UI/password visibility.
- [x] Test invalid credentials and safe messaging.
- [x] Test unauthenticated protected-route redirects.
- [x] Test public Student Registration validation and Faculty Access.

### Task 3: Role portal functional suites
- [x] Add Student search/reservation/security coverage.
- [x] Add Librarian membership-term regression, Book Registration, Excel template, Membership Term coverage.
- [x] Add Faculty Books and Reports coverage.
- [x] Add Administrator Users, Settings, and Librarian-creation coverage.

### Task 4: Whole-route acceptance
- [x] Sweep every protected route under the correct role.
- [x] Exercise safe search/Refresh/Reload controls.
- [x] Audit visible buttons and links.
- [x] Enforce manifest completeness with a unit contract.

### Task 5: Error, browser, and responsive coverage
- [x] Inject representative 400/403/404/409/422/500 Student Book failures.
- [x] Exercise expired-session 401 behavior.
- [x] Run responsive overflow checks at 360/390/768/1440.
- [x] Support Chromium, Firefox, and WebKit through one runner.

### Task 6: Transactional release gate
- [x] Add write-gated Student Reservation create/cancel.
- [x] Add write-gated Librarian Borrow/Return transaction.
- [x] Require dynamic IDs/barcodes/query fixtures in strict mode.
- [x] Add localhost and staging release commands and operator documentation.
