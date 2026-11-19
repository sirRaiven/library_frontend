# SNCBT Library Management System — Phases 35–36

## Phase 35 — Cross-Browser Release Validation

Purpose: prove the authenticated read-only portal behaves consistently in Chromium, Firefox, and WebKit against the **built Nuxt production application**, without changing application data.

### Local prerequisites

- Four role accounts and the four dynamic-route fixtures are configured in `.env.e2e.local`.
- Strapi is running at the configured backend URL, normally `http://localhost:1337`.
- The Nuxt development server is stopped before production-preview testing so port 3000 is available.
- Playwright runtimes are installed with `npm run test:browsers:install`.

Prepare the production build:

```bash
npm run phase35:preview:prepare
```

Run each browser separately first:

```bash
npm run phase35:chromium
npm run phase35:firefox
npm run phase35:webkit
```

These commands start `.output/server/index.mjs` on port 3000, run the authenticated read-only acceptance suite, then stop the preview. Testing the built application prevents Vite development-module transport behavior from being mistaken for a production browser incompatibility.

After the individual engines are understood, run the combined gate:

```bash
npm run phase35:cross-browser
```

The combined command rebuilds first and runs Chromium, Firefox, and WebKit sequentially. Write workflows remain disabled.

### WebKit blocked by Windows Code Integrity

If native Playwright WebKit is prevented from launching with `0xC0E90002` / `STATUS_SYSTEM_INTEGRITY_POLICY_VIOLATION`, treat it as a test-host/browser-runtime block. Do not disable Smart App Control or WDAC just to obtain a green test.

Install and use Playwright's WebKit-via-WSL runtime instead:

```bash
npm run test:browsers:install:webkit-wsl
npm run phase35:webkit:wsl
```

If that succeeds, the combined security-preserving route is:

```bash
npm run phase35:cross-browser:wsl-webkit
```

A browser result counts as application compatibility evidence only after the runtime actually launches and navigates the built SNCBT application.

## Phase 36 — Security, Accessibility, Build, and Deployment Compatibility

### Local production-build gate

Keep the Nuxt development server stopped and Strapi running, then run:

```bash
npm run phase36:local
```

This performs:

- frontend production-security source verification;
- compatibility verification;
- accessibility contracts;
- release-source verification;
- acceptance route-definition coverage;
- TypeScript checking;
- a fresh production build;
- response-header and CORS/deployment verification against the built local production preview.

Local Phase 36 intentionally allows HTTP localhost. It does not replace the strict production-environment verifier.

### Strict production frontend gate

When the actual production environment is configured:

```bash
npm run release:phase36
```

This requires the production URL/security rules, including HTTPS where applicable, then runs security, compatibility, accessibility, release-source, typecheck, and build checks.

### Staging

Create `.env.e2e.staging` from `.env.e2e.staging.example`, populate dedicated read-only role credentials and fixture IDs, then run:

```bash
npm run verify:deployment:staging
npm run test:acceptance:staging
```

If the Windows host blocks native WebKit but the WSL WebKit path has already been validated:

```bash
npm run test:acceptance:staging:wsl-webkit
```

Staging release acceptance is read-only by design.

### Production/live

Create `.env.e2e.production` from `.env.e2e.production.example`. Use dedicated verification accounts and read-only fixture IDs. Never place transaction barcodes in the production acceptance configuration.

```bash
npm run verify:deployment:production
npm run test:acceptance:production:chromium
npm run test:acceptance:production
```

If the validated WSL WebKit route is required on the Windows test host:

```bash
npm run test:acceptance:production:wsl-webkit
```

The production target requires HTTPS for both frontend and backend URLs. Production acceptance keeps `E2E_ALLOW_WRITES=false` and `E2E_ALLOW_REMOTE_WRITES=false`.

### Backend local and production gates

From `library_backend`, local Phase 36 is:

```bash
npm run phase36:local
```

For the actual production environment, use:

```bash
npm run release:check
```

The production backend gate covers tests, typecheck, build, CORS, production configuration, compatibility, and the final Library option-registry verification.

## Release rule

A release is blocked by any real application failure after the target browser has successfully launched: functional failures, console/page/runtime exceptions, unexpected API/network failures, accessibility regressions, responsive overflow in covered views, failed security/CORS/header checks, failed typecheck/build, or insecure production configuration.

An operating-system policy that prevents a browser runtime from launching is reported separately and must not be hidden by suppressing the error or weakening host security. Controlled transaction testing remains localhost-only.

For the complete ordered command sequence, run:

```bash
npm run test:order
```

## v18 compatibility guardrails

Phase 35 production-preview validation now rejects accidental Vite/HMR responses before starting browser acceptance. This prevents a second Nuxt development process or a port race from turning development-server WebSocket failures into false Firefox release failures.

On Windows hosts where native Playwright WebKit is blocked by Code Integrity and the WSL `webkit-wsl` bridge cannot establish its control WebSocket, use:

```bash
npm run phase35:webkit:docker
```

The Docker fallback pins the Microsoft Playwright image to the exact `playwright-core` version in `package-lock.json`, starts the official Playwright server, and uses Playwright's remote `connect()` network exposure for `<loopback>` so the Linux WebKit browser can reach the local Nuxt preview and Strapi API without changing SNCBT CORS settings or lowering Windows security.

Do not run Phase 35 browser commands or the write acceptance suite concurrently. Every command in `npm run test:order` is sequential by design.

A reservation write result stating that the Student already has an active reservation means the E2E fixture is not clean. `Pending`, `Approved`, and `Ready for Pickup` are all active. `Ready for Pickup` must be cleaned through the Librarian Reservations workflow or the test must use another dedicated Student/title fixture; the write test does not bypass that rule.
