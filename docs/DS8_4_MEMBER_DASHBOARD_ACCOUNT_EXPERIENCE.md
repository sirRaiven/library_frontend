# DS-8.4 — Member Dashboard & Account Experience

DS-8.4 modernizes the Student and Faculty landing dashboards and replaces generic/implementation-oriented profile naming with the standard **My Account** experience.

## Scope

- `/student/dashboard`
- `/student/security` (route preserved; UI is now **My Account**)
- `/faculty/dashboard`
- `/faculty/profile` (route preserved; UI is now **My Account**)
- Student and Faculty navigation labels/account menus

No route paths were changed.

## Dashboard hierarchy

Both member portals now use the same information hierarchy:

1. Personal welcome/identity hero
2. At-a-glance metrics
3. Primary work area
4. Action center / notices
5. Compact quick access

The Student dashboard combines borrowed books and active reservations in one primary workspace and moves membership/account status into concise account surfaces. The Faculty dashboard prioritizes assigned books, condition/status updates, notices, and policy guidance.

## My Account pattern

### Student

The former **Profile and Security** screen is now **My Account** with three user-facing sections:

- Profile
- Password
- Sessions & Devices

Official academic information is presented as read-only account data rather than disabled form controls. Editable contact information uses the shared form-section and mobile-safe sticky actions.

### Faculty

The former **Profile** page is now **My Account**. Official Faculty information is clearly separated from editable contact information, with standard shortcuts back to Faculty Library services.

## Responsive behavior

- Phone: compact identity cards, two-column summaries, horizontal account-section navigation, bottom-nav-safe actions.
- Tablet/laptop: content remains stacked where necessary; no desktop-only assumptions.
- Desktop: dashboards use balanced main/action columns; Student account navigation becomes a compact sticky settings rail.

## Protected behavior

DS-8.4 does not change API endpoints, authentication, authorization, routes, session/device actions, password rules, profile update payloads, Student borrowing/reservation data, Faculty reporting, or database behavior.
