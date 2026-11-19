# Administrator Data Management

`/admin/data-management` is the governed record-lifecycle workspace for SNCBT Library administrators. It is intentionally **not** a raw database editor.

## Why the page is restricted

Library records have different retention and relationship requirements. Catalog/configuration records can safely support an archive lifecycle, while identity, circulation history, finance, security, and audit data must continue to use their dedicated workflows.

The page therefore separates the system into two groups:

### Managed Records

The centralized archive lifecycle is available for:

- Books
- Book Copies
- Academic Terms
- Library Announcements
- Library Options
- No-Fine Calendar entries

Books and physical copies expose only safe, controlled inline fields: core bibliographic details for Books and condition/remarks for copies. Classification, shelf assignment, accession identifiers, and circulation states remain governed by their existing Library workflows. Academic Terms, Announcements, Library Options, and manual No-Fine Calendar entries also use controlled inline editing.

### Protected Records

Student/Faculty/Librarian profiles, accounts, borrow/return history, reservations, memberships, fines, visits, Faculty reports, registration requests, notifications, Audit Trail, user activity, sessions, devices, Library Settings, Library Card Design, and System Maintenance remain protected from generic archive/delete operations. The page shows these datasets and links to their existing manager.

## Archive lifecycle

1. **Active record** — may be edited through its approved editor and archived when operational safeguards allow it.
2. **Archived record** — remains in the database and can be restored.
3. **Permanent deletion** — available only while archived, only to a **Super Administrator**, only after a fresh backend dependency check reports no blockers, and only after a reason plus the exact typed confirmation phrase are provided.

Archiving a Book is blocked while a physical copy is Borrowed/Reserved or while an active reservation is Pending, Approved, or Ready for Pickup. A Book Copy cannot be archived while its own status is Borrowed or Reserved. The current Academic Term cannot be archived. Official synchronized no-fine holidays may be removed from fine calculations but cannot be permanently deleted.

## Permanent deletion safeguards

Permanent deletion is intentionally difficult because it cannot be undone:

- archive is required first;
- the backend rechecks dependencies immediately before deletion;
- Super Administrator role is required;
- a reason of at least eight characters is required;
- the user must type the exact confirmation phrase shown by the backend;
- destructive success and denied/failed destructive attempts are recorded in the Audit Trail;
- archive lifecycle metadata is retained in the internal Data Archive Entry ledger.

Examples of dependency blockers include physical copies or reservations referencing a Book, borrowing/report history referencing a Book Copy, memberships/registration/settings referencing an Academic Term, and live records still using a Library Option value.

## Deployment note

The feature adds the internal `data_archive_entries` collection. Back up PostgreSQL before deploying the backend schema change. Restart Strapi so schema synchronization can create the collection, then run the verification and build commands documented in the feature package.
