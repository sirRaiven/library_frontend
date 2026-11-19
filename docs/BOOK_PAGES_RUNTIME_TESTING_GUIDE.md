# Book Pages Runtime Testing Guide

## Purpose
Verify the Nuxt UI Select runtime correction on the migrated Library Collection and Register Book workflows.

## 1. Library Collection — `/librarian/books`
1. Sign in as Librarian.
2. Open **Books & Collection → Library Collection**.
3. Expected: page renders normally; no 500 screen.
4. Open **Shelf Location** filter.
5. Expected: **All Shelf Locations** plus database-backed Shelf Location records are visible.
6. Select a real shelf.
7. Expected: list filters to that shelf.
8. Select **All Shelf Locations**.
9. Expected: shelf filter clears without throwing `SelectItem value must not be an empty string`.
10. Click **Clear Filters** after entering search/filter data.
11. Expected: search and shelf filter reset; page remains usable.

## 2. Register Book — `/librarian/books/register`
1. Open **Register Book** directly from navigation.
2. Expected: page renders normally; no 500 screen.
3. Open **Book Category**.
4. Expected: active database-backed Book Categories are shown; no blank option exists.
5. Open **Shelf Location**.
6. Expected: active database-backed Shelf Locations are shown; no blank option exists.
7. Select a Category and Shelf Location and complete the other required fields.
8. Submit one test book.
9. Expected: registration succeeds and saved values remain visible in Book details/edit.

## 3. Edit Book — `/librarian/books/:id/edit`
1. Open the newly registered book.
2. Open Edit.
3. Expected: current Category and Shelf Location resolve to database-backed options.
4. Change each once and save.
5. Expected: save succeeds and reopening Edit preserves the new selections.

## 4. Console regression checks
During all steps, the browser console must not show:
- `A <SelectItem /> must have a value prop that is not an empty string`
- a Nuxt 500 caused by `SelectItem`

The unrelated `startTime` error from `reportAllChanges` should be evaluated separately if it remains after the SelectItem error is gone, because it is not in the application Select stack.

## 5. Automated checks
Run:

```bat
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

The added `book-select-runtime-contract.test.ts` prevents the empty-string Shelf filter option from returning and requires central filtering of blank database reference codes/names.
