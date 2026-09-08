# Challan-centric fees

Apply `supabase/migrations/202609080001_challan_centric_fees.sql` before deploying this application change. The migration adds issued line-item snapshots, issue dates, session IDs, discounts, explicit payment links, and guarded adjustment/reconciliation functions. It does not modify historical migrations.

`/finance`, `/finance/fees`, and `/finance/dashboard` redirect to `/finance/challans`. Manual income and expense entry is available under Transactions. Fee structures remain generation templates; changes do not rewrite already issued challans.

Every balance uses only non-voided receipts with that challan ID, regardless of payment month. A zero balance is Paid; a positive balance with receipts is Partially Paid; a positive balance without receipts is Unpaid. Date filters use the inclusive issue-date range.

Existing account payments remain intact and unassigned because no reliable historical challan link existed. The list shows a notice while these remain. Managers can review matching account receipts inside a challan and explicitly assign a receipt to that challan. Assignment validates school, account, existing assignment, void status, and remaining balance, and writes an audit entry. Historical receipts spanning multiple challans or exceeding the selected balance require separate reconciliation; this migration never guesses or splits them.

Existing challans retain their issued amount and receive a historical fee line. Future challans snapshot fee-structure lines and the issuance discount when available. Legacy challans without an account retain their record but cannot accept a payment until their data is repaired through a reviewed data migration.

Validation:

- `npm run typecheck`
- `npm test -- src/lib/challans.test.ts src/lib/services/challans.test.ts src/components/finance/fee-management-client.test.tsx`
- `node scripts/test-challan-migration.cjs <path-to-@electric-sql/pglite>` uses isolated, in-memory PostgreSQL fixtures and requires no application credentials. It validates migration/backfill, immutable snapshots, scoped payments, overpayment prevention, discounts, date checks, stale edits, voids, historical assignment, and RPC authorization. It does not replace testing against the deployed Supabase RLS configuration or a concurrent production database.
