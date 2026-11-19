# Phase 8.2 — Portal consistency and accessibility

SNCBT Library Management System · November 19, 2026

## What changed

- Shared page headings and instructions remain visible on phones. Mobile header actions wrap and maintain a 44 px minimum height.
- Sign-in has a visible main heading at all widths, a labeled theme button, and a status announcement separate from the busy form. Library Registration gives users a retry button when the availability check fails.
- The skip link reaches a focusable main landmark in the public and authenticated pages and on both print previews. Nested main landmarks were removed from two Librarian views.
- The Administrator report categories use links with a current-page indicator. Administrator and Librarian report tables have named, keyboard-focusable scroll regions and explicit column headers.
- Student and Faculty mobile navigation reports whether its drawer is open. Text and focus colors were adjusted for readability, and loading placeholders announce their status with decorative shapes hidden from assistive technology.
- Explicit imports connect shared skeletons and Administrator dialogs to Nuxt. The regenerated npm lockfile resolves a clean-install failure, and the Librarian reservation filter now infers its type from the supported statuses.

## Running the frontend

Run `npm ci` and `npm run check` from `library_frontend`. This release was built with Node 24.22.3 and npm 11.9.0. Use your local environment configuration when connecting the application to Strapi.

## Verification

- Clean dependency installation, Nuxt typecheck, production build and the frontend production security configuration check passed.
- Chromium checks used sample API responses. They covered successful and failed sign-in, busy feedback, password visibility, button press and reduced-motion behavior, Student Registration placeholders, skip links, the Librarian desktop and mobile sidebar, Student and Faculty mobile drawers, and Administrator report navigation. A ten-column report scrolled using the keyboard at a 320 px viewport without horizontal page overflow.
- Automated accessibility scans reported zero violations in the seven sampled views. These were sign-in in light and dark modes, Student Registration, and the four portal dashboards at 360 px.
- Live Strapi and database behavior, assistive technology, and browsers other than Chromium remain unverified. The archive contains frontend and backend source and this verification summary.
