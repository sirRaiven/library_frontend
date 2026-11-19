# Phase 8.1 — Data Loading and Practical UI Refinements

**SNCBT Library Management System**  
**Prepared:** November 13, 2026  
**Base:** November 13 Phase 8 source package  
**Scope:** frontend-only source change; existing backend copied unchanged in the combined release.

## Summary

Phase 8.1 addresses the outstanding *page-specific* loading problems from the original 69-page UI audit. A Nuxt route loading bar and layout skeleton do not cover data fetched after the page appears, so this update introduces reusable content-shaped skeletons where those first API requests or report/print preparation operations occur. Existing data stays visible during later refreshes, and invalid or failed loads expose an error/retry state instead of fabricated metrics, blank editable forms, or endless spinners.

### Source changes

- New `app/components/shared/AppDataSkeleton.vue`: `form`, `metrics`, `table`, `report`, `preview` variants; accessible status labels; no artificial progress percentages.
- **Administrator:** create Librarian waits for reference options; system health waits for an actual backend response before presenting statuses or maintenance controls; report generation shows a preview skeleton.
- **Librarian:** Book Registration waits for catalog options; Membership Term does not show fallback term data as server-confirmed data; registration approvals have skeleton/refresh/error states, stale-response protection, debounced search, and a quiet summary-card design; registration QR errors now show a retry instead of an endless spinner; reports, barcode label preview, and library-card preview show appropriate skeletons.
- **Student:** My Account waits for a real profile response and no longer renders editable sections with missing identity data.
- **Public:** Student self-registration uses a form-shaped skeleton while its access rules are being checked.
- **Shared accessibility:** data skeleton pulse animation respects reduced-motion preferences.
- Small copy improvements replace technical language on selected staff forms.

### Treatment of the original 19 pages without a native skeleton

The original audit found 50 pages with inline skeleton/pulse and 19 without. Of those 19:

| Classification | Number | Handling |
|---|---:|---|
| Actual API/data or document preparation screens | 12 | Given first-data or processing skeletons in this update |
| Lightweight redirect pages | 5 | No extra initial API loader; shared route loading exists |
| Sign-in page | 1 | Has a dedicated form-level busy indicator and shared route loading |
| File-driven import page | 1 | Loading is triggered by file selection/import actions, not an initial fetch; keeps existing action loading |
| **Total** | **19** | **All 69 pages retain shared route-level feedback** |

A skeleton should appear for *real pending work*, not merely to animate every page for an artificial interval.

## Verification and risks

**Passed static verification:** TypeScript syntax transpilation of 173 frontend scripts, 69 Vue template-balance checks, 16 inherited navigation/design/static checks, relative source imports, no exposed `.env` file, and explicit Phase 8.1 source contract checks. A source file parsing successfully does **not** establish that the application builds or that the Vue template compiles at runtime.

**Not verified here:** `npm ci`, Nuxt typecheck/build, backend/database connectivity, sign-in or QR code in a browser, mobile sidebars, screen-reader behavior and actual API-loading transitions. The local Node version is 22.16.0 (below Nuxt 4.5.2's compatible 22.x minimum of 22.19.0), and package installation was previously blocked by registry DNS (`EAI_AGAIN`). No new E2E framework or tests were added, in keeping with the user's reset request.

**Pre-existing blockers:** The November 13 browser screenshot shows LAN-origin CORS mismatch for Strapi; the frontend dependency lockfile has optional package issues. Both need resolving on the local machine before calling the system browser-tested.

## Suggested local acceptance steps

1. Back up your existing `library_frontend` and current `.env` file separately before replacing source. Never overwrite `.env` with an example configuration or commit credentials.
2. Use Node.js 22.19+ or a compatible 24.x release. From `library_frontend`, run `npm ci`, then `npm run typecheck` and `npm run build`. If `npm ci` reports lockfile errors, repair the lockfile in a dedicated dependency phase; do not skip them.
3. Configure matching frontend/API host addresses and allow the exact browser origin in backend `FRONTEND_URLS`. Confirm API requests in the browser Network tab. Restart both dev servers after changing `.env`.
4. Login as each available role, navigate its dashboard and list pages, throttle the browser network, and confirm that real skeletons appear only while needed; repeated refreshes should not replace already-loaded records with zeros.
5. Admin: open **System & Maintenance** with backend unavailable—should show an error and no false system metrics. Reconnect and verify actual data.
6. Admin: open **Add Librarian**; options must load before the form. Check failed options and retry behavior.
7. Librarian: open **Book Registration**, **Membership Term**, **Registration Approvals**, **Registration QR**, **Reports**, **Print Labels**, **Print Cards**. Verify initial, refresh, success, and failure states.
8. Change registration-approval filters rapidly with slow network responses. The latest filter results should remain authoritative and no older response should overwrite them.
9. Student: open **My Account** with slow/failed profile request; editable controls should appear only after real account data is available.
10. Public: open **Student Registration**, and test access-check failure/recovery. Test sign-in invalid credentials, duplicate-click prevention and success redirect.
11. Verify mobile widths 360/390/768 px, keyboard-only use, screen-reader status announcements and reduced-motion preference.
12. Run business-operation regression checks after confirming the UI, because this phase was source-reviewed but not database-tested.

## Remaining Phase 8 work

- Real-browser and live-API validation of the above behaviors on all five portals.
- Standardize other error/empty states that cannot be confirmed through source inspection alone.
- Visual contrast and keyboard review, and mobile/table overflow fixes discovered during testing.
- Consolidate layered `main.css` overrides and reduce decorative excess more broadly after screenshots from actual UI are available.
- Do not confuse these with the later Phase 9 performance work or a full Phase 12 E2E implementation.
