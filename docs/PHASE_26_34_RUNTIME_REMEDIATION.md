# Phase 26–34 Runtime Remediation

Date: 2026-09-16

This patch follows the first corrected localhost Chromium acceptance run and fixes the remaining failures at their source without suppressing runtime errors.

## Root causes addressed

1. **SSR elements were visible before Nuxt hydration finished.** The acceptance harness now waits for `useNuxtApp().isHydrating === false` after every hard navigation before tests interact with the page.
2. **Unauthenticated protected hard-loads rendered a protected portal shell before client auth redirect.** Global auth middleware now rejects protected SSR requests that have no `auth-session-hint`, preventing transient portal mounting and hydration/runtime noise.
3. **Role portal mounted services could start before session restoration.** Administrator, Faculty, Librarian, and Student layouts now initialize auth before monitoring/notification/sidebar startup.
4. **Notification polling lacked a role guard.** Librarian and Student polling now returns immediately unless the restored session matches the owning role.

## Preserved behavior

- `/faculty-access` still resolves through `/faculty/dashboard` before unauthenticated users are sent to sign-in.
- Existing sign-in UI, backend authentication endpoints, database behavior, and user-facing messages are unchanged.
- Runtime guard strictness is unchanged; real console, hydration, page, and network failures remain failures.
