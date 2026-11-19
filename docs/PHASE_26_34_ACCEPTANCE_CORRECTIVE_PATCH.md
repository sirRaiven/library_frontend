# Phase 26–34 Acceptance Corrective Patch

Date: 2026-09-16

This revision keeps the existing Phase 26–34 architecture and corrects the acceptance layer based on the first real localhost execution.

## Changes

- Adds `npm run test:acceptance` as a read-only localhost shorthand.
- Labels the runner accurately as **Vitest + Playwright Core**.
- Adds explicit Nuxt, Strapi, and requested-browser runtime preflight messages.
- Stops before Vitest with a clear browser-install command when the requested Playwright executable is missing.
- Rewords route coverage so it is clearly a definition/inventory gate, not proof that all routes executed.
- Corrects `/faculty-access` classification: it is a protected compatibility redirect, not a public route.
- Makes the password-toggle assertion wait for the reactive DOM update instead of reading the attribute immediately after the click.
- Makes invalid-credential acceptance verify that the `/api/auth/local` POST actually returned 400/401 before checking the safe UI message.
- Documents that `npx playwright test` is the wrong runner for these Vitest acceptance files.

## Deliberately not suppressed

Browser hydration mismatches, uncaught `Authentication required` errors, unexpected backend/frontend failures, and other runtime issues remain acceptance failures. This patch does not allow-list them because they can represent real application defects.
