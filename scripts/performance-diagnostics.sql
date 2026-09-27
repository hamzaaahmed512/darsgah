-- READ ONLY. Run against staging first, then production with monitoring access.
-- Review live definitions: repository migrations cannot reveal manual DB drift.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'schools', 'school_members', 'fee_structures')
order by tablename, policyname;

select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public'
  and tablename in ('profiles', 'schools', 'school_members', 'fee_structures')
order by tablename, indexname;

select relname, n_live_tup, seq_scan, idx_scan, last_analyze, last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
order by seq_scan desc limit 30;

-- pg_stat_statements must be enabled; inspect the extension's schema first.
select extname, extnamespace::regnamespace as extension_schema
from pg_extension where extname = 'pg_stat_statements';

-- Run EXPLAIN (ANALYZE, BUFFERS) SELECT public.get_current_app_user()
-- in an authenticated staging transaction with a representative user's JWT
-- claims. SQL Editor's owner role bypasses RLS and is not a valid policy test.
-- Never publish JWTs, service-role keys, or raw query text containing PII.
