# DS-8.3 — Reusable Sign Out Modal

## Purpose

DS-8.3 replaces the four separate Administrator, Librarian, Student, and Faculty sign-out confirmation designs with one reusable SNCBT Library component.

The update is visual and interaction-focused. Existing authentication, portal monitoring, logout calls, redirects, and role behavior remain owned by each portal layout.

## Shared experience

All authenticated portals now use `app/components/shared/AppSignOutModal.vue` with:

- the same **Sign out of SNCBT Library?** heading;
- role-appropriate explanatory text;
- the current account identity for confirmation;
- a visible close control;
- **Stay Signed In** as the initially focused safe action;
- a clearly destructive **Sign Out** action;
- loading protection that prevents repeated confirmation and dismissal while sign-out is running;
- light/dark support through DS-8 theme tokens;
- lightweight mint/emerald circular decoration inspired by the Sign In design;
- no blur-heavy effects.

## Portal wiring

- Administrator → `signOut()`
- Librarian → `handleLogout()`
- Student → `signOut()`
- Faculty → `signOut()`

Only the modal presentation was consolidated. These handlers retain their existing monitoring, authentication, toast, and redirect behavior.

## UX rationale

The safe choice is visually available first and receives initial focus, reducing accidental sign-outs. Account identity is shown before confirmation so staff and members can verify which portal session will close. The modal also explains that signing out closes only the current portal session on the browser and that the user can sign in again later.

## Visual treatment

The modal uses the DS-8 visual language:

- themed surface gradient;
- subtle emerald/mint corner circles;
- restrained borders and shadows inherited from the shared Nuxt UI modal surface;
- semantic red reserved for the actual Sign Out action;
- emerald retained for the SNCBT visual identity and safe action.

The circular treatment is decorative only and uses no blur filters.
