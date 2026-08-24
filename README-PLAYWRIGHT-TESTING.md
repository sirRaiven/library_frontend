# Full Testing Commands
## 1. Important Playwright CLI correction

The project currently uses `playwright-core`, not the full `playwright` package.

Use:

```cmd
npx playwright-core install chromium firefox webkit
```

Do **not** use:

```cmd
npx playwright install chromium firefox webkit
```

Correct the npm script once:

```cmd
npm pkg set "scripts.test:browsers:install=playwright-core install chromium firefox webkit"
```

If you use `VERIFY_FULL_TEST_SUITE.ps1`, also correct its browser-install command once:

```powershell
(Get-Content .\VERIFY_FULL_TEST_SUITE.ps1 -Raw).Replace(
  'npx playwright install chromium firefox webkit',
  'npx playwright-core install chromium firefox webkit'
) | Set-Content .\VERIFY_FULL_TEST_SUITE.ps1
```

> The browser binaries are already installed if `npx playwright-core install chromium firefox webkit` completed successfully.

---

# 2. One-time frontend setup

Open a terminal in:

```text
C:\Users\SNCBT\Desktop\Library_System\library_frontend
```

Then run:

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_frontend
```

If `FILES_TO_UPDATE(15)` has already been applied, **do not need to reapply it**.

If it has not yet been applied:

```cmd
node scripts/apply-full-test-scripts.mjs
npm pkg set "scripts.test:browsers:install=playwright-core install chromium firefox webkit"
node scripts/verify-test-dependencies.mjs
```

Verify installed test packages:

```cmd
npm ls @nuxt/test-utils vitest @vue/test-utils happy-dom playwright-core
```

Install/verify browser engines:

```cmd
npm run test:browsers:install
```

or directly:

```cmd
npx playwright-core install chromium firefox webkit
```

List installed Playwright browsers:

```cmd
npx playwright-core install --list
```

---

# 3. Fast source/unit regression tests

Run:

```cmd
npm run test:unit
```

These tests cover source-level regressions such as:

- Authentication API contracts
- `credentials: "include"`
- `Authorization`
- `X-Device-ID`
- `X-Student-Session`
- Role-to-home-route mapping
- Protected page inventory
- UI contract checks
- User-facing error sanitization
- No `/session/touch` regression
- No `/api/api/...` duplication
- No hardcoded `http://localhost:1337` in application code

Expected result:

```text
Test Files  ... passed
Tests       ... passed
```

Do not continue to the browser gate until failing unit tests are reviewed.

---

# 4. Nuxt runtime integration tests

Run:

```cmd
npm run test:nuxt
```

These tests boot the Nuxt test environment and verify:

- Nuxt runtime configuration
- Authentication/role state behavior
- Runtime composable availability
- Nuxt-specific integration assumptions

---

# 5. Standard frontend test command

Run both Unit + Nuxt runtime tests:

```cmd
npm test
```

This is the standard fast development test command.

---

# 6. Chromium browser regression

Run Chromium first:

```cmd
npm run test:e2e:chromium
```

This is the first browser release gate.

It should cover browser-level behavior including:

- Sign-in page
- Authentication flow mocks
- Role isolation
- Protected routing
- Direct hard-load routing
- Portal shell behavior
- Mobile viewport behavior
- Horizontal overflow regression
- Core UI smoke tests

If this fails, fix/review it before running the full browser matrix.

---

# 7. Firefox browser regression

Run:

```cmd
npm run test:e2e:firefox
```

---

# 8. WebKit / Safari-engine regression

Run:

```cmd
npm run test:e2e:webkit
```

> WebKit testing on Windows is a Playwright browser-engine simulation. Final real-device Safari/iPhone testing is still recommended before production deployment.

---

# 9. All browser engines

Run Chromium + Firefox + WebKit:

```cmd
npm run test:e2e
```

This is the main cross-browser automated gate.

---

# 10. Standard regression gate

Run:

```cmd
npm run test:regression
```

This runs:

```text
Unit tests
+
Nuxt runtime tests
+
Chromium E2E
```

Use this frequently while developing.

---

# 11. Full isolated frontend test gate

Run:

```cmd
npm run test:full
```

This runs:

```text
Unit
+
Nuxt runtime
+
Chromium
+
Firefox
+
WebKit
```

This is the recommended full frontend regression gate before merging a major update.

---

# 12. TypeScript / Nuxt typecheck

Run:

```cmd
npm run typecheck
```

Expected:

```text
No TypeScript errors
```

Any real TypeScript errors should be corrected before release.

---

# 13. Production build test

Run:

```cmd
npm run build
```

This verifies:

- Barcode WASM preparation
- Nuxt production compilation
- Route generation/build integration
- Imports
- Vue SFC compilation
- Nuxt configuration compatibility

Do not treat browser tests as a substitute for a successful production build.

---

# 14. Recommended full local frontend release gate

Run these in order:

```cmd
npm run test:unit
npm run test:nuxt
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
npm run typecheck
npm run build
```

Or use the grouped commands:

```cmd
npm run test:full
npm run typecheck
npm run build
```

---

# 15. PowerShell full-suite runner

The project contains:

```text
VERIFY_FULL_TEST_SUITE.ps1
```

After correcting the Playwright command as shown at the top of this document, run the normal gate:

```powershell
.\VERIFY_FULL_TEST_SUITE.ps1
```

Run all browsers:

```powershell
.\VERIFY_FULL_TEST_SUITE.ps1 -AllBrowsers
```

Run all browsers + typecheck:

```powershell
.\VERIFY_FULL_TEST_SUITE.ps1 -AllBrowsers -Typecheck
```

If you still need browser binaries installed:

```powershell
.\VERIFY_FULL_TEST_SUITE.ps1 -InstallBrowsers -AllBrowsers -Typecheck
```

---

# 16. Backend static validation

Open another terminal:

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_backend
```

Install dependencies if required:

```cmd
npm install
```

Run backend TypeScript validation:

```cmd
npm run typecheck
```

Run Strapi production build:

```cmd
npm run build
```

Run the CORS verifier when the backend is running:

```cmd
npm run verify:cors
```

---

# 17. Start backend for integration testing

From the backend directory:

```cmd
npm run dev
```

or:

```cmd
npm run develop
```

Keep this terminal running.

Typical development backend:

```text
http://localhost:1337
```

---

# 18. Start frontend for manual/integration testing

Open another terminal:

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_frontend
npm run dev
```

Typical development frontend:

```text
http://localhost:3000
```

---

# 19. Optional live Strapi authentication / role / CORS tests

These tests communicate with a real running Strapi backend.

## 19.1 Create test environment file

From `library_frontend`:

```cmd
copy .env.test.example .env.test.local
```

Edit `.env.test.local`.

Example:

```env
RUN_LIVE_TESTS=true

TEST_STRAPI_URL=http://localhost:1337
TEST_FRONTEND_ORIGIN=http://localhost:3000
TEST_FRONTEND_URL=http://localhost:3000

TEST_ADMIN_IDENTIFIER=
TEST_ADMIN_PASSWORD=

TEST_LIBRARIAN_IDENTIFIER=
TEST_LIBRARIAN_PASSWORD=

TEST_STUDENT_IDENTIFIER=
TEST_STUDENT_PASSWORD=

TEST_FACULTY_IDENTIFIER=
TEST_FACULTY_PASSWORD=
```

**Use dedicated test accounts only.**

Prefer a dedicated PostgreSQL test database.

Never commit `.env.test.local`.

## 19.2 Run live tests

```cmd
npm run test:live
```

The live suite can verify:

- Authentication against Strapi
- Correct role identity
- Administrator authorization
- Librarian authorization
- Student authorization
- Faculty authorization
- Cross-role denial
- Credentialed CORS preflight
- Unknown Origin rejection
- Security headers where applicable

---

# 20. Live role-isolation expectations

Expected policy behavior:

```text
Student
  PASS  Student Portal
  DENY  Admin
  DENY  Faculty Portal
  DENY  Librarian circulation

Faculty
  PASS  Faculty Portal
  DENY  Student Portal
  DENY  Admin
  DENY  Librarian circulation

Librarian
  PASS  Librarian/circulation APIs
  DENY  Admin
  DENY  Student Portal
  DENY  Faculty Portal

Administrator
  PASS  Admin APIs
  DENY  Student Portal
  DENY  Faculty Portal
```

Backend policies are the real security boundary.

Frontend redirects are an additional UX/security consistency layer.

---

# 21. CORS / HTTP compatibility test

With the backend running, use:

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_backend
npm run verify:cors
```

Also manually verify browser DevTools:

```text
No unexpected CORS errors
No missing Access-Control-Allow-Origin
No mixed-content warnings
No /api/api/... URLs
No localhost API URLs when testing from another device
No recurring /session/touch
```

---

# 22. Session Touch regression check

The current architecture must NOT generate:

```text
POST /api/system-monitoring/session/touch
POST /api/student-portal/session/touch
```

Automated check:

```cmd
npm run test:unit
```

Manual browser check:

1. Open DevTools.
2. Open Network.
3. Sign in.
4. Leave the portal open for several minutes.
5. Navigate across multiple pages.
6. Search Network requests for:

```text
session/touch
```

Expected:

```text
0 requests
```

---

# 23. Authentication manual browser matrix

Test each account type:

```text
Administrator
Super Administrator
Librarian
Student
Faculty
```

For each role verify:

```text
Login
Refresh browser
Correct dashboard
Direct hard load
Wrong-role route
Logout
Token refresh
Blocked account/device behavior
```

Example wrong-role tests:

```text
Student    -> /admin/dashboard
Student    -> /faculty/dashboard
Faculty    -> /student/dashboard
Faculty    -> /librarian/dashboard
Librarian  -> /admin/dashboard
Librarian  -> /student/dashboard
Admin      -> /student/dashboard
```

Expected result:

```text
No unauthorized portal access
+
backend API remains denied
+
frontend redirects to the correct portal
```

---

# 24. Mobile browser manual validation

Automated Playwright checks are useful but cannot fully replace real-device testing.

Test at minimum:

```text
Android Chrome
Android Firefox
Samsung Internet
iPhone Safari
iPad Safari
```

Verify:

```text
Sign-in
Refresh login/session
Role routing
Navigation/sidebar
Book search
Borrow/return workflow where applicable
Notifications
Library Card
Camera permission
Barcode scanner
Photo/media loading
No horizontal overflow
No mixed-content errors
No CORS errors
```

The scanner requires HTTPS on real mobile devices unless using a browser-recognized localhost development context.

---

# 25. Production-environment verification

Do this only when preparing the real HTTPS deployment.

If using a separate API origin:

```env
NUXT_PUBLIC_STRAPI_URL=https://api.example.edu
```

If using the recommended same-origin reverse proxy:

```env
NUXT_PUBLIC_STRAPI_URL=
```

Then run:

```cmd
npm run verify:production-env
```

Then:

```cmd
npm run build:production
```

Do **not** run the production environment verifier against a normal local HTTP development configuration and expect it to pass.

---

# 26. Recommended complete release sequence

## Frontend

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_frontend

node scripts/verify-test-dependencies.mjs

npm run test:unit
npm run test:nuxt
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

npm run typecheck
npm run build
```

## Backend

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_backend

npm run typecheck
npm run build
```

Start backend:

```cmd
npm run dev
```

Then from the frontend:

```cmd
cd /d C:\Users\SNCBT\Desktop\Library_System\library_frontend
npm run test:live
```

---

# 27. Short version — everyday development

During normal development:

```cmd
npm run test:regression
```

Before finishing a feature:

```cmd
npm run test:full
npm run typecheck
npm run build
```

Before production deployment:

```cmd
npm run test:full
npm run test:live
npm run typecheck
npm run verify:production-env
npm run build:production
```

Also run backend:

```cmd
npm run typecheck
npm run build
npm run verify:cors
```

---

# 28. What to send back when a test fails

Do not remove or weaken a test simply because it fails.

Send:

1. The exact command run.
2. Full terminal output.
3. Name of the failing test file.
4. Browser engine if E2E:
   - Chromium
   - Firefox
   - WebKit
5. Whether Strapi was running.
6. Whether the test was isolated or live.
7. Relevant browser console/network error if applicable.

Example:

```text
Command:
npm run test:e2e:chromium

Failure:
test/e2e/chromium/role-isolation.e2e.test.ts

Backend:
Running on http://localhost:1337

Frontend:
Nuxt Test Utils managed instance

Error:
<paste complete error>
```

This lets us determine whether the problem is:

```text
Test setup
Nuxt runtime
Frontend business logic
Routing
Authentication
Backend authorization
CORS
Browser compatibility
Environment configuration
```

---

# 29. Current test gates

A Library System update should not be considered regression-safe until the applicable gates pass:

```text
[ ] Unit tests
[ ] Nuxt runtime tests
[ ] Chromium E2E
[ ] Firefox E2E
[ ] WebKit E2E
[ ] Frontend typecheck
[ ] Frontend production build
[ ] Backend typecheck
[ ] Backend production build
[ ] Live authentication/role tests
[ ] CORS verification
[ ] Manual mobile-device smoke test
[ ] No Session Touch regression
```

---

## Recommended command to run next

Since Playwright browsers are already installed, run:

```cmd
npm run test:unit
```

Then:

```cmd
npm run test:nuxt
```

Then:

```cmd
npm run test:e2e:chromium
```

If all three pass, continue with:

```cmd
npm run test:e2e
```

and finally:

```cmd
npm run typecheck
npm run build
```
