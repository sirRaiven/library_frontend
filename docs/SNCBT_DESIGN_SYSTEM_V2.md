# SNCBT Library Design System v2

**Current wave:** DS-4 — Operational Staff Page Migration  
**Version:** `2.0-ds4`  
**Scope:** every Library Management System route, including routes that are not exposed in sidebar navigation.

## Purpose

This design system is the shared visual and interaction foundation for the SNCBT Library Management System. It keeps the existing Nuxt 4 + Nuxt UI + Tailwind implementation and adapts proven enterprise-product principles rather than introducing another UI framework.

The structural reference is Cloudscape-style enterprise application design; hierarchy and spacing follow Atlassian-like restraint; data-heavy accessibility follows Carbon-style table and form discipline. These references guide behavior only—the SNCBT application remains its own product and brand.

## Non-negotiable rules

1. **Mobile is a first-class platform.** Every workflow must remain usable from a 320 px viewport upward. Mobile may rearrange or progressively disclose controls, but it must not remove required functionality.
2. **All routes are in scope.** A whole-system UI change includes direct/detail routes, forms, scanners, print/export screens, dialogs, drawers, empty states, loading states and error states—not only links visible in navigation.
3. **One clear primary action per context.** Secondary actions belong in compact secondary controls or overflow menus where appropriate.
4. **Operational information beats decoration.** Use whitespace, typography, borders and restrained elevation before gradients, glow, glass or large decorative cards.
5. **Normal states are quiet.** Strong visual emphasis is reserved for exceptional states such as overdue, blocked, damaged, failed, pending or urgent.
6. **Touch and keyboard are equal requirements.** Touch targets are at least 44 px on coarse-pointer devices; focus-visible behavior must remain obvious.
7. **Responsive means structural adaptation, not merely horizontal scrolling.** Data-heavy pages should supply a mobile record/list representation when a desktop table becomes difficult to use.
8. **No visual change may alter business rules, API contracts, authorization, write behavior or route availability.**

## Foundations

### Brand and semantic color

Emerald remains the institutional action/brand color. Teal is secondary. Success, information, warning and error remain semantic colors. Neutral surfaces are used for most layout and data presentation.

Do not use semantic colors decoratively. Red means destructive/error/critical; amber means warning/attention; green means success/ready; blue means informational state.

### Surface hierarchy

Use three visual levels:

- **Canvas:** page background.
- **Surface:** ordinary content region or card.
- **Raised surface:** menus, overlays, dialogs and exceptional elevated regions.

Large moving surfaces such as side navigation remain solid and do not rely on expensive backdrop blur.

### Typography

The application uses Inter when locally available, then the system sans-serif stack. Default body copy remains readable at 16 px. Supporting labels and captions may use 14 px and 12 px respectively. Page headings should generally stay between 24–30 px rather than using marketing-scale typography.

### Spacing

The product uses a 4 px base grid:

`4, 8, 12, 16, 20, 24, 32, 40, 48 px`

Use 12–16 px gaps inside compact controls and 20–24 px between major content sections. Avoid arbitrary one-off spacing unless a specialist screen requires it.

### Shape

Default radii are deliberately restrained:

- 6 px — tiny controls/details
- 8 px — controls
- 10 px — compact cards
- 12 px — standard surfaces
- 16 px — overlays or deliberately prominent surfaces

Pill shapes are reserved for true chips/tags and compact status indicators. Do not make every badge, card and dialog pill-shaped.

### Elevation

Use borders first and shadows second. Ordinary content should use little or no shadow. Strong elevation is reserved for overlays, menus and dialogs.

### Motion

Standard transitions are 120–200 ms and should animate `transform`, `opacity`, color, border or shadow where possible. Avoid animating large layout dimensions on mobile. Respect `prefers-reduced-motion`.

### Density

- **Librarian/Admin:** compact-to-comfortable density for operational scanning and data work.
- **Student/Faculty:** comfortable density with fewer simultaneous controls.
- **Coarse pointer/mobile:** controls expand to at least 44 px touch height.

## Responsive model

| Range | Intent |
| --- | --- |
| 320–639 px | Phone-first layout; drawer/bottom navigation, record lists, progressive filters |
| 640–767 px | Large phone / small tablet |
| 768–1023 px | Tablet; two-column layouts where content supports them |
| 1024–1279 px | Laptop / desktop operational layout |
| 1280+ px | Expanded desktop; do not stretch readable content indefinitely |

The responsive contract is fluid. Breakpoints are layout opportunities, not device detection.

## Page-width rules

- Normal operational content: maximum ~94 rem.
- Long-form/readable text: maximum ~72 rem or ~72 characters when prose-heavy.
- Full-width data regions may use the operational maximum, but tables still require sensible column prioritization.

# DS-2 — Application Shells & Navigation

DS-2 standardizes the application chrome before page-level migrations begin. The shell must remain stable while pages change underneath it.

## Shell hierarchy

Every authenticated portal follows the same structural order:

1. primary navigation;
2. compact top navigation bar;
3. maintenance/system status region when applicable;
4. page content;
5. mobile primary navigation where the role benefits from it.

The shell must not duplicate page content or business actions. Page-specific actions stay inside the page.

## Administrator shell

- Desktop/laptop: compact persistent/collapsible side navigation.
- Phone/tablet: solid slide-over navigation drawer.
- Density: compact.
- Top bar: navigation control, page context, color mode on larger screens, account menu.
- No mobile bottom navigation because the Administrator destination set is too broad for a stable five-item primary bar.

## Librarian shell

- Desktop/laptop: persistent/collapsible operational side navigation.
- Phone/tablet: solid slide-over navigation drawer.
- Density: compact.
- Existing circulation, collection, user, membership, reporting and notification destinations remain available.
- Top bar retains global collection search, notifications and account access where screen width supports them.
- No mobile bottom navigation because the operational destination set is broad and role workflows frequently cross modules.

## Student shell

Student mobile navigation uses four persistent primary destinations plus **More**:

- Home
- Books
- Borrowed
- Reserved
- More

**More** opens the complete Student navigation drawer and preserves access to History, Digital Library Card, Notifications and Profile/Security. No route is removed.

On desktop/laptop the existing side navigation remains available. Density is comfortable.

## Faculty shell

Faculty mobile navigation uses four persistent primary destinations plus **More**:

- Home
- Books
- Borrowed
- Reports
- More

**More** opens the complete Faculty navigation drawer and preserves access to Profile. No route is removed.

On desktop/laptop the existing side navigation remains available. Density is comfortable.

## Mobile navigation behavior

- Persistent mobile bottom navigation is used only for Student and Faculty portals.
- The bar respects safe-area insets and remains at the bottom of the viewport.
- Active destinations expose `aria-current="page"`.
- The **More** control opens the complete role navigation rather than hiding secondary functionality.
- Authenticated content receives bottom padding so fixed navigation never covers actionable content.
- Administrator and Librarian continue using a drawer because their route sets are too large for a useful bottom bar.

## Side navigation performance contract

- No large moving sidebar may use backdrop blur.
- Mobile drawers do not animate width.
- Expensive transitions are disabled below the desktop navigation breakpoint.
- Desktop collapse/expand may use a short width transition.
- Navigation interaction must preserve route access and cannot replace a working route with a decorative icon.
- Collapsed desktop navigation must continue exposing child destinations through a menu where a category has no direct route.

## Top navigation contract

- Mobile page title is concise and truncates instead of forcing horizontal overflow.
- Color-mode controls may be hidden on the smallest screens when the same action remains available in the account menu.
- Redundant role badges are omitted from the top bar.
- Global notifications remain directly available where the role has notifications.
- Global search is displayed only at widths where it does not crowd page context and account actions.

## Public/auth shell contract

- Public routes participate in the same design-system canvas and accessible skip-navigation behavior.
- `/` remains the authentication entry point.
- `/student-registration` remains public and keeps its complete registration/help workflows.
- `/faculty-access` remains a protected compatibility redirect and does not become a separate UI destination.
- Public shell updates must never alter sign-in, registration, membership-validation or redirect logic.

## Shared component direction

The current shared primitives are:

- `PortalMobileBottomNav` — role-appropriate Student/Faculty mobile primary navigation.
- `AppSkipLink` — keyboard bypass for shells and public pages.
- `SystemMaintenanceBanner` — global operational status within authenticated shells.

Later waves should converge pages onto these shared primitives:

`PageHeader`, `SectionHeader`, `PrimaryButton`, `SecondaryButton`, `OverflowMenu`, `SearchField`, `FilterBar`, `FilterSheet`, `StatusBadge`, `MetricCard`, `DataTable`, `MobileRecordList`, `EmptyState`, `ErrorState`, `LoadingState`, `FormSection`, `StickyFormActions`, `Dialog`, `MobileSheet`, `Tabs`, `Pagination`, `Toast`, `Alert`.

## Accessibility contract

- Visible focus indicators for keyboard users.
- No icon-only action without an accessible name.
- No state communicated by color alone.
- Form labels remain programmatically associated and visibly understandable.
- Dialog focus trapping and restoration must continue to work.
- Zoom/reflow must remain usable at 200% and should be reviewed at 400% where practical.
- Reduced-motion preferences are honored globally.
- Async loading, success and error messages should be announced appropriately where the component supports it.
- Mobile bottom navigation uses semantic `<nav>` markup with an accessible label.

## Route coverage contract

The current baseline contains **67 Vue page files**. Whole-system UI verification must keep the route/page inventory intact unless a separately approved feature change intentionally adds or removes a route.

This includes public entry routes, all Admin/Librarian/Student/Faculty routes, direct detail/edit pages, import/print pages, barcode/scanner screens and utility routes.

## DS-1 implementation files

- `app/assets/css/main.css` — global visual tokens and universal responsive/accessibility primitives.
- `app.config.ts` — Nuxt UI shared component defaults.
- `app/constants/design-system.ts` — typed breakpoint/layout contract.
- `scripts/verify-design-system-foundation.mjs` — source-level foundation and route-inventory gate.
- `test/unit/design-system-foundation-contract.test.ts` — regression contract.

## DS-2 implementation files

- `app/layouts/admin.vue`
- `app/layouts/librarian.vue`
- `app/layouts/student.vue`
- `app/layouts/faculty.vue`
- `app/layouts/default.vue`
- `app/components/shared/PortalMobileBottomNav.vue`
- `app/pages/index.vue`
- `app/pages/student-registration.vue`
- `app/assets/css/main.css`
- `app/constants/design-system.ts`
- `scripts/verify-design-system-shells.mjs`
- `test/unit/design-system-shell-contract.test.ts`

# DS-3 — Shared Components & Interaction Patterns

DS-3 defines the reusable interaction vocabulary that later route migrations must use. It does **not** change business rules, API calls, permissions, or protected workflows. The purpose is to stop page-by-page UI drift and make mobile behavior predictable before the 66 legacy routes are migrated in DS-4 and DS-5; later approved feature routes extend the inventory.

## Action hierarchy

A view should normally expose **one primary action**. Secondary operations remain visible when they are frequently used and low risk; infrequent operations belong in an overflow menu.

- `AppActionBar` aligns primary and secondary actions consistently.
- `AppOverflowActions` provides the standard `More` menu entry point.
- On phones, action groups wrap instead of creating horizontal overflow.
- Sticky mobile actions are reserved for long forms or task completion, not ordinary navigation.
- Destructive actions must never be visually promoted above the primary task unless the current screen exists specifically to perform that destructive action.

## Search and filtering

`AppFilterBar` is the standard search/filter container.

Desktop/tablet may show search, quick filters and advanced filters together. On phones:

1. search stays directly visible;
2. quick filters may scroll horizontally when necessary;
3. advanced filters collapse behind a **Filters** control;
4. the filter control shows an active-filter count;
5. clearing filters is available when filters are active.

Filters must change view criteria only. A filter control must never silently perform a destructive or record-changing operation.

## Status presentation

`AppStatusBadge` is reserved for state that helps a user make a decision. Default/normal states should often use the quiet style or plain text so exceptional states remain visually meaningful.

Recommended semantic mapping:

- neutral — normal/informational state;
- primary — selected/current system state;
- success — completed/available/returned/approved;
- info — in-progress or informational;
- warning — due soon/pending/requires review;
- error — overdue/blocked/failed/damaged/critical.

Never communicate status with color alone; badges include visible text and may optionally include a dot.

## Async states

`AppAsyncState` standardizes loading, failure, empty and populated content.

- Loading uses skeletons matching a record-list rhythm rather than a page-blocking spinner.
- Error states explain what failed and may expose an explicit retry action.
- Empty states use concise language and may expose the one useful next action.
- A true empty result must not be confused with a loading state or an API failure.

## Responsive data views

`AppResponsiveDataView` establishes the default adaptive pattern:

- below 768 px: semantic record cards/list;
- 768 px and above: desktop/tablet data table or denser data region.

`AppRecordCard` is the standard mobile record shell. It supports title, secondary information, status, metadata, row actions and a footer without nesting action buttons inside a navigation link.

Horizontal table scrolling remains acceptable only for specialist data that cannot be meaningfully represented as a mobile record. It is not the default mobile strategy.

## Forms

`AppFormSection` groups related fields under a concise title and optional explanation. Long forms should use multiple form sections rather than one uninterrupted card.

`AppStickyFormActions` establishes the Save/Continue/Cancel action region. On phones it may remain visible at the bottom of a long form and respects the safe-area inset.

- Primary completion action belongs on the right on larger screens.
- Cancel/back is secondary.
- Validation stays next to the relevant field or section.
- Sticky actions must not obscure fields, bottom navigation, or browser safe areas.

## Dialogs and sheets

`AppDialogFrame` standardizes dialog content hierarchy: title, concise consequence/context, body, then actions. The frame is intentionally separate from `UModal`/future sheet containers so existing focus trapping and open/close logic are preserved during migration.

On small screens, route migrations may choose a full-height modal or mobile sheet when the task needs more space. Confirmation dialogs should remain short and focused.

## Shared primitives introduced in DS-3

- `AppActionBar`
- `AppOverflowActions`
- `AppFilterBar`
- `AppStatusBadge`
- `AppAsyncState`
- `AppResponsiveDataView`
- `AppRecordCard`
- `AppFormSection`
- `AppStickyFormActions`
- `AppDialogFrame`

Existing primitives retained and aligned with the same system:

- `AppPageHeader`
- `AppSectionHeader`
- `AppMetricCard`
- `AppEmptyState`
- `AppFilterPanel` (legacy-compatible; migrate to `AppFilterBar` where mobile progressive disclosure is needed)
- `PortalMobileBottomNav`
- `AppSkipLink`

## Migration rule for DS-4+

Page migration must preserve the original route, permissions, API calls and business actions first. A page is not considered migrated merely because it looks correct on desktop. Each migrated route must be verified at phone, tablet and desktop widths and must preserve every previously available important action.

**All routes are in scope**, including direct-entry detail/edit/import/print routes that do not appear in sidebar navigation.

## DS-3 implementation files

- `app/components/shared/AppActionBar.vue`
- `app/components/shared/AppOverflowActions.vue`
- `app/components/shared/AppFilterBar.vue`
- `app/components/shared/AppStatusBadge.vue`
- `app/components/shared/AppAsyncState.vue`
- `app/components/shared/AppResponsiveDataView.vue`
- `app/components/shared/AppRecordCard.vue`
- `app/components/shared/AppFormSection.vue`
- `app/components/shared/AppStickyFormActions.vue`
- `app/components/shared/AppDialogFrame.vue`
- `app/components/shared/AppPageHeader.vue`
- `app/assets/css/main.css`
- `app/constants/design-system.ts`
- `scripts/verify-design-system-components.mjs`
- `test/unit/design-system-components-contract.test.ts`


## DS-4 — Operational Staff Page Migration

Wave DS-4 applies the shared design-system contracts to **every Administrator and Librarian route**, including direct-entry pages that do not appear in sidebar navigation. Redirect-only compatibility pages remain route-preserving and do not render a separate UI.

### Staff-page contract

- Every rendered Admin/Librarian page uses the `sncbt-staff-page` scope so spacing, overflow, touch targets, and mobile action behavior are consistent.
- Administrator and Librarian layouts expose the `sncbt-staff-view` shell contract.
- Existing business logic, API calls, permissions, route destinations, scanner behavior, and mutation handlers are protected; DS-4 changes templates/styles only.
- Mobile header actions remain horizontally reachable instead of turning into tall button stacks.
- Data-heavy routes use semantic mobile record cards where implemented, while desktop/tablet keeps the existing data tables.
- Legacy tables that remain on specialist routes must stay horizontally contained inside the page and must never force page-level overflow.
- Print routes keep their printing behavior and receive only safe viewport/surface normalization.

### Responsive record migrations in DS-4

The following high-frequency operational lists now switch to record cards below 768 px while retaining their existing desktop table and actions:

**Administrator:** Users, Librarians, Account Review, Activity, Devices, Sessions, Audit Trail, plus per-account Activity, Devices, and Sessions.

**Librarian:** Students, Faculty, Library Visits, Membership Records, Fine Records, and No-Fine Calendar.

The mobile cards preserve the same important actions (view, edit, activate/deactivate, revoke, renew, verify/waive, and calendar actions) rather than hiding functionality.

Progressive mobile filters are active on the highest-use staff list screens so search stays immediately visible while secondary filters move behind a touch-friendly **Filters** control below 768 px.

### Whole-route coverage

DS-4 verification checks the complete 22-page Administrator inventory and 25-page Librarian inventory. `/admin` and `/admin/monitoring-reports` are redirect-only compatibility routes; all other rendered staff pages must carry the DS-4 page scope. This maintains the project rule that **all routes are in scope**, not only sidebar-visible destinations.

### Safety rule

A visual migration must not rewrite business logic in the same wave unless a UI defect cannot be resolved otherwise. DS-4 therefore preserves the `<script setup>` content of every Administrator and Librarian page from the DS-3 baseline and changes template/style composition only.

### DS-4 runtime stabilization note

Shared DS components that live under `app/components/shared/` must be **explicitly imported** by migrated page components when they are referenced by filename-only tags such as `<AppResponsiveDataView>` or `<AppRecordCard>`. This avoids Nuxt directory-prefix auto-import ambiguity and prevents named-slot content (including tables and mobile record cards) from disappearing at runtime.

Long staff pages must remain vertically scrollable inside the dashboard content canvas. The shared canvas therefore keeps `overflow-y: auto`, `overflow-x: hidden`, and vertical overscroll containment. Dense metric groups must also reflow before they become too narrow; five-column operational summaries are reserved for sufficiently wide viewports.

# DS-5 — Student & Faculty Experience Migration

DS-5 applies the Design System v2 member-experience contract to every Student and Faculty portal route, including direct book-detail routes and redirect entry routes. The detailed inventory is maintained in `docs/DS5_MEMBER_ROUTE_MATRIX.md`.

## Member portal priorities

Student and Faculty interfaces prioritize the questions and actions users most often need on a phone: current loans, due dates, reservations, book availability, reports, notifications, profile/contact updates and account security. Mobile UI must not be a compressed copy of desktop management screens.

- Student and Faculty member pages use `.sncbt-member-page`.
- Search-heavy views use `AppFilterBar`: search stays visible while secondary filters progressively disclose on phones.
- Collection cards use the shared `PortalBookCard`, with a compact phone presentation and the richer cover treatment retained from `sm` upward.
- Metric groups use two columns on phones when the content can remain readable.
- Forms use shared `AppFormSection` / `AppStickyFormActions` when a long form needs persistent completion controls.
- Mobile bottom navigation remains authoritative for primary Student/Faculty destinations; duplicate in-page quick navigation is reduced on phone widths.
- The shared shell, not page-specific `margin-bottom` hacks, reserves clearance above fixed mobile navigation and iOS safe areas.
- Default/current states remain visually quiet. Warnings, overdue states, lost/replacement states, blocked access and other exceptions receive semantic emphasis.

## Information-reduction rules

Member-facing screens should not expose internal inventory/security implementation details unless they help the member complete a task. Repeated instructional alerts are consolidated. Technical identifiers may remain available on larger screens while phone views prioritize title, status, dates and next actions.

# DS-6 — Specialist Workflows

DS-6 covers workflows where a generic list/form treatment is not enough: circulation scanners, inventory intake, barcode/card production, report generation, and Student registration approval. The detailed route inventory is maintained in `docs/DS6_SPECIALIST_WORKFLOW_MATRIX.md`.

## Task-first specialist contract

- Scanner tasks put scan input and camera/manual alternatives before supporting information.
- Two-column workflow layouts activate only on sufficiently wide screens; laptop/tablet widths remain single-column when a side panel would reduce task clarity.
- Exact spreadsheet/report/print matrices use contained internal overflow rather than forcing the application viewport sideways.
- Semantically representable operational tables use mobile record cards while retaining their desktop table.
- Print routes keep physical print dimensions separate from on-screen preview sizing.
- Print and production toolbars remain touch reachable on phones and respect device safe areas.
- Library Card Designer controls and live preview stack before switching to a split editor/preview workspace on very wide screens.
- Approval actions available in desktop tables must remain available in phone record cards.

## Safety rule

DS-6 is a presentation/interaction migration. Page-level workflow scripts are protected from modification in this wave. Scanner handlers, API calls, validation, print state, approval mutations, report exports, and route destinations must remain intact.

# DS-7 — Whole-System UX, Responsive & Interaction Verification

DS-7 closes the Design System v2 redesign with a complete 67-route verification contract. The detailed matrix is maintained in `docs/DS7_WHOLE_SYSTEM_UX_VERIFICATION.md`.

## Closure rules

- Every route is in scope, including redirects, direct-entry detail/edit pages, public registration, scanners, print tools, dialogs, and utility workflows.
- Representative viewport verification uses 320, 390, 768, 1024, and 1440 px widths rather than treating desktop resize as sufficient mobile validation.
- Light/dark and touch/keyboard behavior are part of the same acceptance contract as responsive layout.
- The application viewport itself must not scroll horizontally. Exact data/print matrices may scroll only inside explicit contained regions.
- Student/Faculty fixed bottom navigation must never cover the final content or sticky form actions.
- Dynamic browser viewport units are used for floating camera/dialog surfaces that must remain inside mobile Safari/Chrome visual bounds.
- DS-7 is a verification and containment wave; it does not modify Library business rules, APIs, permissions, scanner mutations, report calculations, or print-state transitions.

# DS-8 — Visual Theme Harmonization

DS-8 promotes the approved Sign In visual language to the whole application. The detailed specification is maintained in `docs/DS8_VISUAL_THEME_HARMONIZATION.md`.

## Theme contract

- The system canvas uses the Sign In mint/off-white palette in light mode and deep navy/teal palette in dark mode.
- Emerald remains the institutional primary accent; semantic warning/error/info/success colors keep their meanings.
- Navigation, shared Nuxt UI cards, overlays, metric cards, page headers, form/filter surfaces and mobile record cards inherit shared theme tokens.
- Circular artwork is intentionally subtle: stronger on metric/welcome/empty-state surfaces, faint on general cards, and avoided on dense data/print regions.
- DS-8 uses gradients and pseudo-elements instead of broad blur/backdrop-filter effects on authenticated pages.
- Print output resets gradients/decorative circles to white so physical card, barcode and report geometry remains unchanged.
- DS-8 is visual only. Existing business logic, routes, APIs, permissions, scanner handlers and responsive contracts remain protected.
