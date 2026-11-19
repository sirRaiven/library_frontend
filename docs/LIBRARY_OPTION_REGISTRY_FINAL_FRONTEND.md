# Library Option Registry — Final Frontend Contract

The Nuxt frontend has one option source: `useLibraryOptions()`.

- Structural choices: Educational Level and Semester.
- Year/Grade Level is derived from Educational Level.
- Extensible choices: Student Program, Faculty Department, Faculty Employment Type, Librarian Position, Book Category, Shelf Location.
- Academic Terms remain operational records and are exposed through `academicTerms` / `currentAcademicTerm`.
- Historical inactive values are injected only for unchanged edit fields.
- `__all__` remains UI-only and is never persisted.
- The retired `useReferenceData()` composable and V1/V2 rollback documentation are removed.
