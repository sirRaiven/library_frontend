# Phase 8.1 Manual Acceptance Checklist

Use actual local data and the browser Network panel. **Not a record of tests already passed.**

| Role / page | Test | Result / notes |
|---|---|---|
| Public sign-in | Invalid and successful sign-in, busy state, password show/hide, protected redirect | [ ] |
| Public registration | Initial availability fetch; unavailable backend produces alert, not endless spinner | [ ] |
| Admin — Add Librarian | Positions load before form appears; error offers understandable feedback | [ ] |
| Admin — System & Maintenance | Real health data only; never claim online before API result; refresh recovery | [ ] |
| Admin — Reports | Generate and regenerate; show preview loading and retain old report while updating | [ ] |
| Librarian — Register Book | Category/shelf options fetched before form; error/retry; save operation unchanged | [ ] |
| Librarian — Membership Term | Initial fetch and failure don't show fallback term as verified; form available after success | [ ] |
| Librarian — Registration Approvals | First-load skeleton, filters, delayed responses, refresh, retry and no false zero totals | [ ] |
| Librarian — Registration QR | Generate, failed generate, retry, copy, download, print | [ ] |
| Librarian — Reports | Generate and regenerate, customization, PDF/Word/Excel, pending state | [ ] |
| Librarian — Barcode Print | Preview placeholder, barcode rendering, print action | [ ] |
| Librarian — Library Card Print | Initial placeholder, real preview, image loading and print action | [ ] |
| Student — My Account | Profile fetch required before edit controls; refresh, failure and retry | [ ] |
| All portals | Desktop sidebar, Librarian expansion, mobile drawer, route progress, keyboard navigation | [ ] |
| All portals | No broken layout at 360, 390, 768, 1024, 1440px and 200% zoom | [ ] |
| Accessibility | Form labels, visible focus, useful status announcements, reduced-motion mode | [ ] |
| Network errors | Correct CORS origin, clear retry state, no stale false-success claims | [ ] |

**Sign-off:** record tester, date, environment, expected/actual result and screenshots separately. Do not mark accepted from source-only review.
