# SNCBT Library Design System v2 — DS-8.1 Permanent Dark Navigation Shell

DS-8.1 keeps authenticated side navigation visually stable while the rest of the SNCBT Library application continues to support Light mode and Dark mode.

## Scope

The permanent dark navigation treatment applies to the Administrator, Librarian, Student and Faculty desktop sidebars, collapsed sidebars, and each portal's mobile drawer/slideover navigation.

The navigation shell uses the same deep navy/teal family established by the Sign In page. It does not switch to a pale surface when Light mode is active and does not change when Dark mode is selected.

## Palette

- Base navy: `#041725`
- Deep canvas: `#031118` → `#020b11`
- Highlighted text: near-white
- Muted text: blue-slate
- Primary navigation accent: emerald
- Active route: restrained emerald tint plus a narrow emerald edge indicator
- Decorative circles: low-opacity emerald and cyan radial shapes only

## Light mode

The sidebar remains dark navy while the main application canvas, navbar, cards, forms and dialogs may use the mint/off-white DS-8 palette.

## Dark mode

The same sidebar remains dark navy while the rest of the application switches to the deep navy DS-8 page palette. The sidebar does not visibly jump between color schemes.

## Mobile drawer

The Admin, Librarian, Student and Faculty mobile drawer uses the same permanent dark navigation surface. Drawer navigation behavior, route availability, collapse/open behavior and account actions are unchanged.

## Student and Faculty bottom navigation

The fixed bottom navigation is intentionally excluded from permanent dark treatment. It remains color-mode aware because it visually belongs to the current page rather than the sidebar/navigation drawer.

## Accessibility

The fixed-dark scope supplies its own local Nuxt UI background, text and border variables to preserve readable contrast for section labels, navigation items, collapsed icons and account controls. Focus behavior and keyboard navigation are unchanged.

## Performance

DS-8.1 uses CSS gradients and local custom properties only. It does not introduce blur or backdrop-filter effects to the sidebar.

## Safety

DS-8.1 is a visual-only navigation-shell update. No route, authentication, permission, API, scanner, circulation, report, database, validation or other business logic is changed.
