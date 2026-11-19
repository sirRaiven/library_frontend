# DS-8 — Visual Theme Harmonization

The **Sign In page** is the visual reference for the final SNCBT Library identity. DS-8 applies that visual language to **all 67 routes** through shared design tokens and components rather than copying the Sign In layout into operational pages.

## Theme direction

### Light mode
- Canvas: soft mint/off-white (`#f4faf7` toward `#eaf3ef`).
- Primary accent: institutional emerald.
- Surfaces: white to very light mint.
- Secondary decorative accent: very low-opacity aqua.
- Borders: slate with a restrained emerald mix.

### Dark mode
- Canvas: deep navy/teal-black (`#031118` toward `#020b11`).
- Primary accent: brighter emerald for contrast.
- Surfaces: navy (`#071c31`) and deep-blue raised panels.
- Secondary decorative accent: low-opacity cyan/emerald.
- Borders: muted blue-slate.

## Decorative circle policy

The circular motif from Sign In is used deliberately rather than on every visual element:

- Metric/summary cards receive the clearest paired circle treatment.
- Page headers receive one very subtle circle on tablet/desktop.
- General cards receive only a faint corner radial circle.
- Welcome and empty-state surfaces may use a slightly larger orb composition.
- Tables, spreadsheet/report matrices, scanners, dense forms, and exact print layouts remain comparatively quiet so information remains easy to scan.

Circles are always non-interactive, low contrast, and behind content.

## Whole-system coverage

The theme is inherited through shared application shells and Nuxt UI defaults:

- Administrator portal
- Librarian portal
- Student portal
- Faculty portal
- Sign In and public Student Registration
- Direct-entry detail/edit routes
- Dialogs and dropdown overlays
- Shared cards, filters, forms, mobile records, empty states and metric cards

No route needs a separate one-off color implementation to participate in the theme.

## Performance

Authenticated pages do not reproduce the Sign In page's large blurred artwork. DS-8 uses CSS gradients and lightweight pseudo-elements for circles. The authenticated DS-8 section must not add broad `filter: blur(...)` or `backdrop-filter` effects.

This preserves the mobile/navigation performance work completed in earlier waves.

## Accessibility and semantic color

Emerald is the brand/primary-action color, not a replacement for semantic states. Success, warning, error, and information colors retain their meanings. Text contrast, focus rings, keyboard behavior, and touch targets remain governed by the existing Design System contracts.

## Print

Print workflows reset themed gradients, decorative circles and shadows to a plain white output surface. Existing A4, CR80, barcode, Library Card and report print geometry remains authoritative.

## Safety contract

DS-8 is a visual-only harmonization wave. It does not change page-level business logic, routes, APIs, permissions, validation, scanner handlers, circulation rules, membership rules, report calculations, or database behavior.
