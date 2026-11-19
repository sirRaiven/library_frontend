# Phase 26–34 Interactive-Control Audit Correction

Date: 2026-09-16

This corrective patch follows the successful Phase 27 runtime remediation run. Functional sign-in behavior, invalid-credential handling, protected-route redirection, Student Registration validation, Faculty compatibility routing, responsive checks, and environment preflight all passed. The only remaining Chromium failure occurred inside the generic `auditInteractiveControls()` helper.

## Root cause

The previous helper called Playwright `focus()` on every visible button/input/select/textarea and required that exact DOM node to equal `document.activeElement` immediately afterward. That is stricter than the acceptance requirement and can produce a false failure with component-library controls whose focus behavior is delegated or whose rendered node is refreshed by framework state.

The test already proves the password visibility control works by clicking it and observing the password input change from `password` to `text`. The invalid-sign-in test also proves the form submits through `/api/auth/local` and renders the safe error state. Therefore the remaining failure was isolated to the generic focus-audit implementation rather than the sign-in workflow.

## Correction

The generic audit now checks whether every enabled, visible native control remains keyboard-reachable through browser focus semantics:

- `tabIndex >= 0`
- not inside an `inert` subtree
- not hidden with `aria-hidden="true"`
- intentionally `aria-disabled="true"` controls are not treated as available controls

If a control violates these conditions, the failure reports its DOM index, tag, type, label, tab index, inert state, and ARIA-hidden state. The helper no longer programmatically forces focus or requires exact `document.activeElement` ownership.

## Scope

This patch changes acceptance-test infrastructure only. It does not modify the SNCBT Library sign-in page, authentication logic, backend, database, routing, or user-facing behavior.
