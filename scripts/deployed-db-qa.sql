-- Read-only deployment audit. Run as a database administrator in the deployed
-- database. This connection is NOT suitable for authenticated RLS behavior tests.

-- 1. Actual migration ledger. Compare every version with the repository's
-- supabase/migrations filenames; duplicate timestamps with different suffixes
-- in the repository deserve particular attention.
select version::text as version,
       to_jsonb(m) - 'statements' as ledger_metadata,
       md5(coalesce(to_jsonb(m)->>'statements', '')) as recorded_statements_md5
from supabase_migrations.schema_migrations m
order by version;

with required(version, purpose) as (
  values
    ('202609180001', 'atomic promotion RPC'),
    ('202609280001', 'historical result enrollments'),
    ('202609290001', 'combination promotion and enrollment snapshots'),
    ('202609290002', 'exam and result integrity'),
    ('202609290004', 'historical subject evidence'),
    ('202609290005', 'reporting filter indexes'),
    ('202609290006', 'finance reporting aggregates')
)
select r.version, r.purpose,
       exists (select 1 from supabase_migrations.schema_migrations m
               where m.version::text = r.version) as recorded_applied
from required r order by r.version;

-- Fingerprints catch a manually changed function or a misleading ledger.
select p.oid::regprocedure::text as signature,
       p.prosecdef as security_definer,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.oid in (
  to_regprocedure('public.promote_class_students(uuid,uuid[],uuid[],uuid[],uuid[])'),
  to_regprocedure('public.promote_class_students_with_combinations(uuid,uuid[],uuid[],uuid[],uuid[],jsonb)'),
  to_regprocedure('public.generate_fee_challans(uuid,text,uuid,uuid,uuid)')
) order by 1;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'enrollments' and column_name in ('roll_no','major','ends_on'))
       or (table_name = 'student_subject_enrollment_history'
           and column_name in ('student_id','subject_id','valid_from','valid_to')))
order by table_name, column_name;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in ('enrollments_result_history_idx','exams_result_session_idx',
                    'student_subject_history_card_idx')
order by indexname;

-- Historical backfill coverage: expected zero missing rows. Run after
-- 202609280001 has been applied. Scope by school_id if preferred.
select m.school_id, count(distinct (m.student_id, x.class_id, c.academic_year_id)) as missing_historical_enrollments
from public.marks m
join public.exams x on x.id = m.exam_id and x.school_id = m.school_id
join public.classes c on c.id = x.class_id and c.school_id = m.school_id
where c.academic_year_id is not null
  and not exists (
    select 1 from public.enrollments e
    where e.school_id = m.school_id and e.student_id = m.student_id
      and e.class_id = x.class_id and e.academic_year_id = c.academic_year_id
  )
group by m.school_id order by m.school_id;

-- 2. Effective RLS definition and grants. Permissive policies OR together;
-- a FOR ALL policy also applies to SELECT/INSERT/UPDATE/DELETE.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls,
       pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('exams','marks','fee_payments','attendance_records','enrollments')
order by c.relname;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('exams','marks','fee_payments','attendance_records','enrollments')
order by tablename, cmd, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('exams','marks','fee_payments','attendance_records','enrollments')
  and grantee in ('anon','authenticated','PUBLIC')
order by table_name, grantee, privilege_type;

select p.oid::regprocedure::text as helper, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app'
  and p.proname in ('can_access_school','has_school_role','has_school_role_key',
                   'is_head_teacher_for_class','is_teacher_assigned_to_subject',
                   'can_teacher_edit_exam')
order by helper;

-- 6. DB-side measurement. pg_stat_statements is optional; use a separate
-- authenticated staging connection for EXPLAIN under RLS.
select extname, extnamespace::regnamespace as extension_schema
from pg_extension where extname = 'pg_stat_statements';

select relname, n_live_tup, seq_scan, idx_scan, last_analyze, last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
  and relname in ('exams','marks','fee_payments','attendance_records','enrollments',
                  'finance_transactions','library_books','library_loans')
order by relname;
