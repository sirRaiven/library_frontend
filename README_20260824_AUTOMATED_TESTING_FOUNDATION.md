# SNCBT Library Management System — Automated Testing Foundation

## Update
`FILES_TO_UPDATE(14)` — August 24, 2026

This update adds the first non-invasive automated frontend regression suite using
`@nuxt/test-utils` and Vitest. It does not modify application business logic.

## Prerequisite
The development dependencies should already be installed:

```bash
npm install -D @nuxt/test-utils vitest @vue/test-utils happy-dom playwright-core
```

## Apply
Copy the update files into the frontend root, then run:

```bash
node scripts/apply-test-scripts.mjs
npm run test:unit
npm run test:nuxt
npm test
```

## Initial coverage
- User-facing error sanitization
- No reintroduction of `/session/touch`
- No hardcoded `http://localhost:1337` in application source
- No accidental `/api/api/...` paths
- `credentials: "include"` auth regression guard
- `X-Device-ID` regression guard
- `X-Student-Session` regression guard
- Nuxt runtime environment smoke test

## Why no test-utils Nuxt module yet?
`@nuxt/test-utils/module` is optional and mainly provides a Nuxt DevTools integration.
The project deliberately starts with Vitest configuration only so test tooling does not
change normal application startup/runtime behavior.

## Next testing layer
After this suite passes, add browser/E2E coverage for Chromium, Firefox, and WebKit,
then test against a running Strapi test database for login, authorization, circulation,
reservations, fines, notifications, Faculty workflows, session/device controls, and CORS.
