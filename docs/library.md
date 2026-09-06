# Library

The Library workspace is at `/library`, under **Operations** in the sidebar.

## Enable the module

Apply these migrations in order through the project's normal Supabase deployment process:

1. `202609060001_librarian_role.sql`
2. `202609060002_library.sql`

The enum migration must commit before the library migration. The second migration creates the catalogue, physical copies, loans, reservation queue, borrowing rules, and audit history. It grants principal, administrator, and librarian library access for existing schools and initializes new schools automatically. It does not replace existing role permission settings. A custom role needs both `library:view` and `library:manage` to operate the workspace.

No live database migration is performed by the application itself. Before rollout, verify these migrations against the target database using the existing deployment process.

## Assign a librarian

The principal can open **Staff → Add Staff** or **Admin Console → Add User** and select **Librarian**. For an existing account, open **Admin Console**, edit the member, and select **Librarian** as the role. This replaces that member's previous role. Librarians land on `/library` after signing in and retain access to their leave and announcements. They do not receive student editing, finance, payroll, or user administration permissions.

The existing administrator delegation also permits creating and assigning non-elevated librarian accounts. Only principals and administrators with library management access may change library rules or waive fines.

## Daily workflow

1. **Catalogue:** add title, author, ISBN, category, publisher, and shelf. Register every physical copy separately with a school-unique accession number and optional replacement cost. Accession numbers are trimmed and uppercased. Search by title, author, ISBN, category, shelf, or accession.
2. **Issue & return:** select an available copy, active student/staff borrower, and due date. Borrowers cannot exceed their loan limit or take another book while they have an overdue loan. Active staff borrowers are school member accounts; record-only staff are not currently borrowers.
3. **Renew:** extend an eligible loan by the configured period. Overdue or closed loans, loans at the renewal limit, and titles with waiting reservations cannot renew.
4. **Return:** close the loan as returned, damaged, or lost. Good copies become available; damaged/lost copies stay unavailable until their condition is updated. Lost copies add their replacement cost to the overdue fine. A returned loan cannot be closed twice.
5. **Reservations:** queue borrowers per title. The earliest reservation has priority across that title's available copies. Issuing to that borrower fulfils the reservation. Cancel stale reservations manually; there is no automatic expiry or messaging.
6. **Fines:** overdue charges use calendar days in Asia/Karachi and the daily rate recorded when the book was issued. Charges are finalized when the loan closes. Record partial/full payments; principal/admin waivers require a reason. Payments and waivers cannot exceed the remaining balance. These are library records, not automatic finance-ledger entries.
7. **Reports:** export inventory, complete loan history, or overdue loans to CSV. The recent activity panel shows the latest 100 events; the database keeps all events.

Titles may be archived only after open loans and waiting reservations are resolved. Archiving preserves copies, loans, and history. Restore a title to lend its available copies again. Copy condition changes cannot bypass an active loan.

## Security and integrity

Tables are school-scoped and protected by row-level security. Browser clients have read-only table access; authenticated writes use `library_mutate`, which checks the current member's resolved permissions and validates transitions in PostgreSQL. A school-level transaction lock serializes inventory/circulation changes. A partial unique index prevents two active loans against the same copy. Composite foreign keys prevent cross-school copy/title and loan/copy links.

Borrower selection uses a permission-checked RPC exposing only name, identifier, kind, and admission number or staff role. Historical loans retain borrower names even if a student or staff record is later removed. Record-only staff, automated reminders, barcode image generation, bulk imports, and automatic finance posting are not part of this module.

## Verification

Run the targeted UI/validation tests with:

```sh
npm test -- src/lib/validation/library.test.ts src/components/library/library-workspace.test.tsx src/lib/permissions.test.ts
npm run typecheck
```

The isolated database test loads the actual library migrations plus the existing permission functions into PGlite. Install `@electric-sql/pglite` in a temporary directory, then run:

```sh
node scripts/test-library-db.mjs /absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js
```

It does not connect to Supabase. It checks permissions, tenant isolation, database-level write protection, duplicate issues/accessions, limits, renewals, reservation ordering, lost/damaged returns, fine payment/waiver balances, and disabled-user access. Target-environment migration and authenticated browser smoke tests should also be performed before rollout.
