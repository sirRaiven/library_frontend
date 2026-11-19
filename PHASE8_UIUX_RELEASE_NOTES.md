# SNCBT Library Management System — Phase 8 UI/UX and “AI-Slop” Design Audit

**Date:** November 13, 2026
**Scope:** Cleaned frontend baseline, 69 Vue page files, five layouts, shared components, sign-in, and design CSS. Source review and static checks only; no browser/real-user testing performed.

> “AI slop” describes generic, repetitive or visually noisy design patterns. The audit does not claim that any particular code or screen was created by AI. The goal is clearer and more original institutional UX.

## Executive findings

| Finding | Source evidence | Remediation/status |
|---|---|---|
| Sign-in feels like a generic web template | Original `app/pages/index.vue` used “Welcome back”, layered radial blobs and a decorative “Ready” tile | **Updated:** school-first access layout, practical library service copy, concise assistance guidance, accessible busy state |
| Inconsistent initial loading experience | 50 of 69 pages had inline `USkeleton`/pulse; 19 did not | **Shared route-level skeleton now covers every layout/route**; page-specific API loaders still require acceptance testing |
| No cohesive route progress indicator | `app/app.vue` lacked `NuxtLoadingIndicator` | **Updated:** lifecycle-driven 3px progress bar, no invented percentages |
| Librarian sidebar not aligned to approved reference | Expanded menu used `UContentNavigation`; mobile/collapsed menu used flyouts | **Updated:** `UNavigationMenu` with `orientation="vertical"`, expandable groups, compact flyouts retained |
| Repetitive decorative backgrounds / card ornamentation | 28 radial-gradient declarations remain in layered style sheet | **Partially improved:** flat shared surfaces and removed decorative pseudo-elements; follow-up deduplication required |
| Missing verified accessibility evidence | No working browser/E2E suite in clean baseline | **Pending:** keyboard-only, screen reader, contrast, axe, reduced-motion, responsive UAT |
| Source-level performance risk | `public/sncbt-logo.png` ~5MB; giant single-page views, multiple nested cards | **Pending Phase 9:** optimize assets and measure render/interaction |
| Old build/test environment gap | npm install blocked by registry DNS; local Node v22.16.0 lower than Nuxt requirement | **Pending:** install on correct Node release, run Nuxt typecheck/build and real browser verification |

## Screen design principles to enforce

1. **Task first:** screens describe what to do (borrow, return, reserve, renew), not generic marketing language.
2. **One hierarchy:** clear page title, supporting text only if useful, visible primary action, restrained secondary actions.
3. **Do not decorate records:** avoid random gradient orbs, icons for their own sake, and oversized empty status tiles.
4. **Show truthful feedback:** route progress, initial-data skeleton, button busy text, success/error after real outcomes; never fake completion percentages.
5. **Respect existing information:** loading indicators must not erase editable form data, hide errors, or block completed actions indefinitely.
6. **Accessible by default:** visible focus, 44px-ish touch targets, labels, reduced motion, logical reading order and color contrast.
7. **Keep role context:** the same components should feel consistent while Student/Faculty remain simpler than staff workflows.

## What was changed in the current update

- Rebuilt public sign-in layout without “Welcome back” or decorative Ready card; retained authentication, redirects, maintenance warnings, and error handling.
- Added a live sign-in progress strip and status message; fields and submit control disable during active submission to prevent accidental duplicate attempts.
- Added Nuxt’s built-in route `NuxtLoadingIndicator` and a shared `usePageExperience` lifecycle state.
- Added `AppPageLoadingSkeleton` in all five layouts (Admin, Librarian, Student, Faculty, public) using variants for dashboard, form and records.
- Kept actual `<slot />` mounted during page-loading Suspense to avoid a navigation deadlock.
- Replaced expanded Librarian `UContentNavigation` with `UNavigationMenu` vertical groups, preserving compact flyouts and route-specific active state.
- Removed Nuxt UI content integration setting after confirming no `UContentNavigation` references remain.
- Introduced restrained interaction transitions, active-press feedback, keyboard focus indicators, reduced-motion safeguards and muted form/record surfaces.
- Replaced generic Student dashboard greeting with task-centered “Your Library overview.”
- Backend intentionally **unchanged**; no credentials, database dumps, uploads or test data added.

## Outstanding tasks / acceptance criteria

**Critical before adoption**
- Restore the frontend dependencies with a compatible Node release (Nuxt 4.5.2 requires Node >=22.19.0 in v22 line), resolve existing lockfile errors; run `npm run typecheck` and `npm run build`.
- Open and navigate all five layouts with real local Strapi configuration. Resolve the CORS origin mismatch reported in the latest runtime screenshots.
- Verify vertical Librarian menu: groups expand/collapse, active links, keyboard navigation, scroll, narrow view, compact flyout, and sidebar close after navigation.
- Verify route skeleton stays visible only while Nuxt route loading is pending; confirms failures clear it and reduced motion disables animations.
- Verify sign-in: invalid credentials, membership notices, device blocks, duplicate-click protection, disabled controls, password visibility and successful redirect.

**Page-level API loading follow-up**
- Existing inline loaders were not deleted. A shared route skeleton is shown while the page resolves, but it **does not replace** a page’s own initial API fetch skeleton when it fetches after mount.
- The pages flagged below without inline skeletons should receive context-specific loading states during the remaining Phase 8 work. Some (simple redirects or static forms) may not need a data loader.

**Design refinement pass**
- Consolidate layered CSS instead of keeping long-lived overrides; visually review flat-surface changes in light and dark themes.
- Standardize empty/error/success patterns, form section labels, table density, action placement and large-screen/phone navigation.
- Screen-reader and color-contrast testing, keyboard-only testing, `prefers-reduced-motion`, and zoom at 200%.

