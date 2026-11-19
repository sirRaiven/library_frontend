# DS-8.3.1 — Desktop Student/Faculty Portal Visibility Hotfix

## Issue

Student and Faculty page content rendered correctly below the 1024px breakpoint but disappeared at laptop/desktop widths.

## Root cause

The Student and Faculty layouts intentionally attach `sncbt-mobile-bottom-nav-spacer` to their `<main>` element so phone/tablet content can scroll above the fixed bottom navigation.

A desktop media rule incorrectly grouped that class with the actual fixed bottom navigation:

```css
@media (min-width: 1024px) {
  .sncbt-mobile-bottom-nav,
  .sncbt-mobile-bottom-nav-spacer {
    display: none !important;
  }
}
```

Because the spacer class is on `<main>`, the rule hid the entire Student/Faculty page at desktop widths.

## Correction

At desktop widths only the fixed bottom navigation is hidden. The main content remains a normal block and its mobile-only extra bottom clearance is reset.

No Vue page/layout business logic, route, API, authentication, session monitoring, navigation destination, or member data behavior changed.
