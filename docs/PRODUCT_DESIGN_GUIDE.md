# SNCBT Library Product Design Guide

This guide is the UI/content baseline for the SNCBT Library Management System. It is intended for maintainers and does not appear in the live portal.

## Design philosophy

The interface should feel calm, modern, institutional, and task-focused. Use neutral surfaces for most of the product and reserve color for brand, action, and meaning.

### Color balance

- 70–80% neutral surfaces and text hierarchy
- 15–20% primary brand/action color
- 5–10% semantic status colors

### Semantic palette

- **Primary / Emerald:** normal primary actions, active navigation, selected tabs, focus accents, brand details
- **Success / Green:** completed, paid, returned, active, verified, healthy
- **Warning / Amber:** due soon, maintenance, needs attention, pending review
- **Error / Red:** overdue, blocked, failed, lost, destructive actions
- **Info / Sky:** neutral informational notices
- **Neutral / Slate:** surfaces, secondary actions, archived/disabled/secondary states

Do not use `success` merely because an action is positive. A normal action such as **Save**, **Register**, **Borrow**, **Submit**, or **Generate Report** should normally use `primary`.

## Page structure

Use the shared `sncbt-page-shell` and role-specific page header components where practical.

Recommended order:

1. Page title + short description + primary action
2. Summary/metrics if needed
3. Search/filters
4. Main table/content
5. Secondary information

Avoid oversized headings, excessive gradients, nested cards, and decorative color that does not communicate meaning.

## Human-friendly messages

The UI should explain what the user can do next, not expose implementation details.

Never show framework/database terminology such as Strapi, PostgreSQL, API route names, stack traces, request internals, SQL errors, or shell commands to ordinary users.

### Standard messages

- Invalid sign-in: **The username/email or password is incorrect.**
- Session expired: **Your session has expired. Please sign in again.**
- Permission denied: **You do not have permission to complete this action.**
- Network unavailable: **We could not connect to the Library System. Check your connection and try again.**
- Maintenance write attempt: **This action is unavailable while the system is under maintenance.**
- Duplicate OR: **This Official Receipt number has already been used. Enter a different receipt number.**
- Unexpected server failure: **Something went wrong while processing the request. Please try again.**

Technical diagnostics remain in server/application logs.

## Content style

- Use short page descriptions focused on user goals.
- Prefer **Library Visits** over implementation-oriented **Entry Log** where the meaning is the same.
- Prefer **History** over **History Logs** in navigation.
- Prefer **Profile** over role-repeated names such as **My Faculty Profile** when the portal context is already clear.
- Do not mention development phase numbers in the live UI.
- Use sentence case for labels and action text.

## Accessibility

- Every icon-only control needs an accessible name (`aria-label` or equivalent).
- Do not communicate status by color alone; pair color with text or iconography.
- Preserve visible keyboard focus.
- Preserve reduced-motion behavior.
- Keep touch targets comfortable on mobile.
- Use labels and field-local validation messages for forms.

## Technical details and progressive disclosure

Some Administrator workflows legitimately need technical evidence. Keep the business-facing summary visible first and move request IDs, hashes, raw metadata, and similar diagnostics into an **Advanced technical details** disclosure.

## Dark mode

Use semantic Nuxt UI tokens (`bg-default`, `bg-elevated`, `text-highlighted`, `text-muted`, `border-default`) instead of hard-coded light/dark colors whenever possible.

## Typography and hierarchy

Use one predictable hierarchy across all portals:

- Page title: 1.5–1.75rem, semibold
- Section heading: 1–1.125rem, semibold
- Card heading: 0.875–1rem, semibold
- Body: 0.875–1rem
- Supporting metadata: 0.75–0.8125rem

Avoid large display typography on operational screens. The interface should prioritize scanability over decoration.

## Cards and surfaces

Use cards only when they communicate grouping or hierarchy. Prefer one strong card around a table or workflow rather than cards nested inside cards.

- Standard card radius: 1–1.125rem
- Standard border: neutral/default
- Standard shadow: subtle (`--sncbt-shadow-card`)
- Interactive cards may lift slightly on hover, but static cards should not animate
- Avoid strong green shadows or colored borders unless color represents status

## Filters and search

Search and filters should sit together in a single filter surface close to the records they affect. Keep the most-used search field first and place low-frequency filters after it.

On mobile:

- Stack fields vertically
- Keep primary search full-width
- Avoid horizontally scrolling control bars
- Do not make filters sticky if they consume too much viewport height

## Tables and data-heavy screens

Library administration is data-heavy, so tables must optimize scanning:

- Keep column labels short and descriptive
- Use status badges rather than colored text alone
- Right-align numeric totals where practical
- Put row actions at the end
- Prefer one clear primary row action; place secondary actions in a menu when there are many
- Use horizontal scrolling only when a mobile card layout would hide important context
- Keep table headers visually distinct but low-contrast

## Forms

Group long forms into meaningful sections. Each section should answer one user question, such as **Student information**, **Account details**, or **Membership**.

- Labels should be concise
- Help text should explain policy, not implementation
- Validation should be shown beside the field whenever possible
- Destructive actions belong away from the normal Save/Submit action
- Use a single primary submission action per form

## Empty, loading, and error states

Every major data region needs a useful state:

- **Empty:** explain why there is nothing to show and what will appear there
- **Loading:** use skeletons for layouts/tables; avoid blank pages
- **Error:** explain the user-facing problem and provide a retry action when possible

Avoid generic **No data** and implementation-oriented failures.

## Navigation

Navigation should reflect user tasks rather than database modules.

- Group related workflows together
- Keep labels short
- Do not repeat the portal role in every label
- Avoid duplicate destinations that expose the same underlying function
- Use the same active-state treatment across Admin, Librarian, Student, and Faculty portals
- Keep sidebar group labels readable; they are orientation aids, not micro-copy

## Responsive behavior

Design for these practical breakpoints:

- 360–430px: phones
- 768px: tablets
- 1024px: small laptops
- 1280px+: desktop operational use

Primary actions should remain reachable without horizontal scrolling. Scanner, camera, and registration workflows should be usable with touch input.

## Interaction philosophy

The interface should feel responsive without being distracting:

- Use 120–180ms transitions for hover/focus changes
- Avoid large motion or decorative page transitions
- Respect `prefers-reduced-motion`
- Give immediate feedback for Save/Submit/Scan actions
- Keep loading indicators local to the component being updated whenever possible

