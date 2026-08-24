# SNCBT Library Management System — Full Frontend Testing Set

This suite extends FILES_TO_UPDATE(14) and covers authentication contracts, roles, routing, UI regressions, Nuxt runtime state, Chromium/Firefox/WebKit browser smoke tests, and optional live Strapi role/CORS checks.

## 1. Apply scripts

```powershell
node scripts/apply-full-test-scripts.mjs
node scripts/verify-test-dependencies.mjs
```

## 2. Install browser engines once

```powershell
npm run test:browsers:install
```

This downloads Chromium, Firefox and WebKit for the built-in `@nuxt/test-utils` browser helpers.

## 3. Fast local gate

```powershell
npm run test:unit
npm run test:nuxt
```

## 4. Browser regression

```powershell
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

Or all three:

```powershell
npm run test:e2e
```

The browser suite verifies the sign-in UI, direct unauthenticated access to protected role routes, public registration, and phone-width overflow behavior.

## 5. Standard regression gate

```powershell
npm run test:regression
```

This runs unit + Nuxt-runtime + Chromium E2E.

## 6. Full isolated frontend gate

```powershell
npm run test:full
```

This runs unit + Nuxt-runtime + Chromium + Firefox + WebKit without requiring a live Strapi database.

## 7. Optional live Strapi policy/CORS gate

Copy `.env.test.example` to `.env.test.local`, set `RUN_LIVE_TESTS=true`, and use dedicated test accounts. Do not use production credentials.

Then run:

```powershell
npm run test:live
```

The live suite validates login, returned roles, allowed role endpoints, cross-role denial, configured credentialed CORS preflight, rejection of an unknown Origin, and frontend security headers when `TEST_FRONTEND_URL` is configured.

## Coverage included

- Authentication endpoint/credential/header contracts
- Access-token non-persistence guard
- Refresh-on-401 contract
- Device-block handling contract
- Application role list and home-route mapping
- Protected route prefixes and public-route contract
- Protected-page inventory
- Session Touch Removal regression
- API base/transport regression
- User-facing technical error sanitization
- Nuxt runtime role normalization/session clearing
- Sign-in UI structural regression
- Light/dark/mobile CSS invariants
- Chromium browser smoke
- Firefox browser smoke
- WebKit/Safari-engine smoke
- Phone viewport overflow
- Optional live Student/Faculty/Librarian/Admin policy isolation
- Optional live CORS/security-header checks

## Important distinction

The isolated tests can run safely without Strapi. The `live` project is deliberately opt-in because it exercises real accounts and backend policy state. Use a dedicated test database where possible.
