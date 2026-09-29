# Deployed database QA: migrations, RLS, promotion, fees, latency

Run sections 1–2 read-only against production and staging. Run the two-school
probe read-only against both environments with real, separate school users.
Run promotion and fee writes **only in a dedicated staging school** with
disposable students and a database snapshot. Save the result of every query,
the deployment SHA, test time, actor role, and school ID. Keep JWTs, cookies,
and student details out of shared evidence.

## 1. Migration ledger and live schema

In the deployed Supabase SQL Editor, run
`scripts/deployed-db-qa.sql`. The migration ledger query lists **all**
recorded versions. Compare it with the filenames from
`supabase/migrations/` in the deployed commit, not just local working files.
The required-version query must show `true` for `202609180001`,
`202609280001`, and `202609290001` before testing combinations. Check
`202609290004` before testing historical subject evidence. Check
`202609290005` and `202609290006` before evaluating the latest performance
work.

The function-definition output must show the five-argument
`promote_class_students(uuid,uuid[],uuid[],uuid[],uuid[])` with an advisory
transaction lock, active-roster validation, target enrollment insertion,
source completion, and `class_promotions` insertion. The six-argument
`promote_class_students_with_combinations` must also exist for entry into
Grades 9 and 11. `enrollments.roll_no` and the historical result indexes
must exist after `202609280001`. The backfill coverage query should return
**no rows**; any positive count means marked exams still lack a matching
school, class, and academic-year enrollment. Ledger presence alone does not
prove that a manually replaced function still matches the migration.

The repository has some different filenames sharing the same timestamp
prefix. Inspect `ledger_metadata`, function definitions, columns, and
indexes whenever a version is ambiguous. If the migration ledger table is
absent, stop and determine how this deployment was migrated; do not infer
applied status from file names.

## 2. Effective RLS versus the repository role matrix

The SQL audit prints RLS enablement, every policy, grants, and helper-function
definitions for `exams`, `marks`, `fee_payments`,
`attendance_records`, and `enrollments`. Review **all** rows: permissive
policies combine with OR, and a `FOR ALL` policy contributes to each
command. Check both `USING` and `WITH CHECK`. Confirm the helper functions
require an active school membership and never make one school's membership
valid for another school. Also confirm `anon` has no unintended grants.

Expected from the current repository migrations:

- **Exams:** administrator reads school exams; an assigned teacher reads and
  edits their own allowed exams; principal reads special exams and reviews
  them through the approval RPC; registrar (`student_staff`) reads approved
  special exams. Latest teacher insert/update policy is
  `202609290002`, so compare that live definition rather than an older
  migration. Regular-versus-special approval rules must stay intact.
- **Marks:** administrator reads school marks; assigned teacher reads/writes
  own eligible exam marks; principal reads special-exam marks; registrar reads
  approved special-exam marks. Exam editing and approval helpers also constrain
  writes.
- **Fee payments:** any active school member can SELECT under
  `app.can_access_school`; administrator, principal, and cashier can INSERT
  and UPDATE under the later `has_school_role_key` policies. The payment
  integrity trigger additionally rejects overpayment and unverified online
  payment.
- **Attendance records:** administrator, principal, and registrar read their
  school; a head teacher reads/submits their own head class; the authorized
  reopen actor can resubmit within the configured 24-hour window. Check the
  linked attendance-session policy and reopen helper as well.
- **Enrollments:** administrator, principal, and registrar read/manage their
  school; a head teacher reads their head class. Historical completed rows
  remain readable to the authorized roles. The `enrollments_manage FOR ALL`
  policy also grants SELECT to its roles.

Treat this as the code-derived matrix, then compare it with the signed-off
product role matrix. Record any extra live policy or changed helper as drift.
Use one real user per relevant role in staging to check allowed and denied
actions; do not emulate RLS in SQL Editor as table owner. Record expected
empty reads, explicit denials, and successful own-school reads. A denial with
no successful control read is inconclusive.

## 3. Two-school isolation

Prepare two active staging schools A and B, each with a different signed-in
administrator and at least one readable row in each of the five target tables.
Run:

```powershell
$env:QA_SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'
$env:QA_SUPABASE_ANON_KEY = 'YOUR-PUBLISHABLE-OR-ANON-KEY'
$env:QA_SCHOOL_A_ID = 'SCHOOL-A-UUID'
$env:QA_SCHOOL_B_ID = 'SCHOOL-B-UUID'
$env:QA_SCHOOL_A_JWT = 'SIGNED-IN-USER-A-ACCESS-TOKEN'
$env:QA_SCHOOL_B_JWT = 'SIGNED-IN-USER-B-ACCESS-TOKEN'
node scripts/qa-two-school-isolation.mjs
```

The script uses the anon key with each user's JWT, never a service key. For
both directions and each table it confirms an own-school control row, then
tries a list filtered to the other `school_id` and a direct `id` lookup
without a school filter. Expected: ten PASS lines, with `list=0 direct=0`.
Missing own-school fixtures fail the run. Repeat with representative teacher,
registrar, and cashier accounts where their own-school permissions permit a
control row. In the browser, also paste a school-A direct-ID URL while signed
in to B; expect a not-found/denied page and no school-A payload in Network.

## 4. Promotion and historical cards — staging writes

Use four distinct students: Grade 9 default, Grade 9 custom, Grade 11
default, Grade 11 custom. Ensure both source classes belong to one active
academic year, each student has exactly one active enrollment, each custom
combination is active and offered to the source class, and the next grades
exist. Before promotion, create and approve representative exams/marks in
the **source session** using the ordinary teacher/principal flow. Record the
source class IDs, student IDs, source year ID, `enrollments.major`, and
approved exam IDs. Back up the staging school.

1. In **Classes**, promote the Grade 9 class to 10 and the Grade 11 class to
   12, choosing the existing default/custom combinations. These promotions
   call the five-argument atomic RPC; new choices are required only on entry
   into Grades 9 and 11. Verify the review step and submit once. Re-submit
   the same request in staging and expect an already-promoted error with no
   additional enrollment or marker.
2. Run the SQL below after replacing the four UUID placeholders. Expect one
   completed source enrollment and one active target enrollment per student,
   with distinct academic years. The source `major` stays unchanged; target
   `major` equals the student's carried default or custom value. Expect one
   `class_promotions` marker per source class, and no duplicate active
   enrollment per student.
3. As an authorized registrar/principal, open **Results → Result Cards** and
   select the source `sessionId`, source class, exam type, and month where
   applicable. Check individual and whole-class cards for all four students.
   Then select the new session and target class. Source cards must retain
   source class/session/subjects/approved marks; target cards must show target
   class/session and only approved target exams. No target result is invented
   from source marks. Verify PDF page count equals the selected class roster.
4. In a separate staging fixture, test a stale roster or a student ID from
   another school. The RPC must reject the whole operation: no target
   enrollment, completed source row, new year, or promotion marker.

```sql
with qa(student_id, source_class_id, target_class_id) as (
  values
    ('GRADE9_DEFAULT_STUDENT_UUID'::uuid, 'GRADE9_SOURCE_CLASS_UUID'::uuid, 'GRADE10_TARGET_CLASS_UUID'::uuid),
    ('GRADE9_CUSTOM_STUDENT_UUID'::uuid, 'GRADE9_SOURCE_CLASS_UUID'::uuid, 'GRADE10_TARGET_CLASS_UUID'::uuid),
    ('GRADE11_DEFAULT_STUDENT_UUID'::uuid, 'GRADE11_SOURCE_CLASS_UUID'::uuid, 'GRADE12_TARGET_CLASS_UUID'::uuid),
    ('GRADE11_CUSTOM_STUDENT_UUID'::uuid, 'GRADE11_SOURCE_CLASS_UUID'::uuid, 'GRADE12_TARGET_CLASS_UUID'::uuid)
)
select q.student_id, e.class_id, c.academic_year_id, e.status, e.major,
       e.starts_on, e.ends_on, count(*) over (partition by q.student_id, e.class_id) as rows_for_class
from qa q join public.enrollments e on e.student_id = q.student_id
  and e.class_id in (q.source_class_id, q.target_class_id)
join public.classes c on c.id = e.class_id and c.school_id = e.school_id
where e.school_id = 'SCHOOL-A-UUID'::uuid
order by q.student_id, c.academic_year_id;

select source_class_id, count(*) as markers
from public.class_promotions
where school_id = 'SCHOOL-A-UUID'::uuid
  and source_class_id in ('GRADE9_SOURCE_CLASS_UUID'::uuid, 'GRADE11_SOURCE_CLASS_UUID'::uuid)
group by source_class_id;

select student_id, count(*) as active_enrollments
from public.enrollments
where school_id = 'SCHOOL-A-UUID'::uuid
  and student_id in ('GRADE9_DEFAULT_STUDENT_UUID'::uuid,
                     'GRADE9_CUSTOM_STUDENT_UUID'::uuid,
                     'GRADE11_DEFAULT_STUDENT_UUID'::uuid,
                     'GRADE11_CUSTOM_STUDENT_UUID'::uuid)
  and status = 'active'
group by student_id having count(*) <> 1;
-- Expected: no rows.

select e.student_id, e.major, scc.class_id as custom_combination_available_in_target
from public.enrollments e
left join public.student_subject_combination_classes scc
  on scc.school_id = e.school_id and scc.class_id = e.class_id
  and scc.combination_id = case when e.major ~ '^custom:[0-9a-fA-F-]{36}$'
    then substring(e.major from 8)::uuid end
where e.school_id = 'SCHOOL-A-UUID'::uuid
  and e.student_id in ('GRADE9_CUSTOM_STUDENT_UUID'::uuid,
                       'GRADE11_CUSTOM_STUDENT_UUID'::uuid)
  and e.status = 'active' and e.major ~ '^custom:[0-9a-fA-F-]{36}$';
-- Expected: two rows, both with non-null custom_combination_available_in_target.

select e.student_id, x.class_id, c.academic_year_id, x.id as exam_id,
       x.exam_type, x.status, x.approval_status, m.marks_obtained, m.is_absent
from public.enrollments e
join public.classes c on c.id = e.class_id and c.school_id = e.school_id
join public.exams x on x.class_id = c.id and x.school_id = e.school_id
left join public.marks m on m.exam_id = x.id and m.student_id = e.student_id
  and m.school_id = e.school_id
where e.school_id = 'SCHOOL-A-UUID'::uuid
  and e.student_id = 'ONE_TEST_STUDENT_UUID'::uuid
order by c.academic_year_id, x.exam_date, x.id;
```

## 5. Fee cycle — staging writes

Use a disposable student with a mapped fee structure and active enrollment.
Record account ID, academic year, `total_payable`, concession, `amount_paid`,
and due date before writes. Choose two previously unused months (for example
`2026-10` and `2026-11`) and note that the current generator creates each
month's challan from the account's `total_payable`. Generate each month in
**Finance → Challans**, then repeat one month: the repeat must create zero
and skip the existing student. Record a partial cash payment through the UI,
check its receipt, payment history, ledger transaction, and account balance.
For a late-payment fixture, use an already overdue account/challan and pay
today; verify the UI's due-date/status behavior without backdating a payment
through the app. Attempt an amount above the remaining balance and confirm
rejection with no payment or ledger row.

Apply a fixed or percentage concession through the UI after recording its
pre-change state. Verify the new account total and the existing two challan
amounts. The current implementation changes `student_fee_accounts.total_payable`
but does **not** rewrite already generated challans; explicitly record
whether this matches the approved business rule. Then promote/create a second
academic-session account for the same student and inspect the current-session
balance and total student debt separately. Do not infer a current-session
balance by subtracting one session's payments from all sessions' challans.

Run these read-only checks after each step:

```sql
select fc.fee_month, fc.amount, fc.due_date, fc.student_fee_account_id,
       sfa.academic_year_id, fc.created_at
from public.fee_challans fc
left join public.student_fee_accounts sfa on sfa.id = fc.student_fee_account_id
  and sfa.school_id = fc.school_id
where fc.school_id = 'SCHOOL-A-UUID'::uuid
  and fc.student_id = 'FEE_TEST_STUDENT_UUID'::uuid
order by fc.fee_month;

select sfa.id, sfa.academic_year_id, sfa.total_payable, sfa.amount_paid,
       sfa.discount_type, sfa.discount_value, sfa.due_date,
       coalesce((select sum(fc.amount) from public.fee_challans fc
         where fc.school_id = sfa.school_id
           and fc.student_fee_account_id = sfa.id), 0) as session_challans,
       coalesce((select sum(fp.amount) from public.fee_payments fp
         where fp.school_id = sfa.school_id
           and fp.student_fee_account_id = sfa.id and not fp.is_voided), 0) as session_payments
from public.student_fee_accounts sfa
where sfa.school_id = 'SCHOOL-A-UUID'::uuid
  and sfa.student_id = 'FEE_TEST_STUDENT_UUID'::uuid
order by sfa.academic_year_id;

with totals as (
  select coalesce((select sum(fc.amount) from public.fee_challans fc
           where fc.school_id = 'SCHOOL-A-UUID'::uuid
             and fc.student_id = 'FEE_TEST_STUDENT_UUID'::uuid), 0) as all_session_challans,
         coalesce((select sum(fp.amount) from public.fee_payments fp
           join public.student_fee_accounts sfa on sfa.id = fp.student_fee_account_id
             and sfa.school_id = fp.school_id
           where fp.school_id = 'SCHOOL-A-UUID'::uuid
             and sfa.student_id = 'FEE_TEST_STUDENT_UUID'::uuid
             and not fp.is_voided), 0) as all_session_payments
)
select *, greatest(all_session_challans - all_session_payments, 0) as all_session_due
from totals;

select fp.id, fp.payment_date, fp.amount, fp.is_voided, fp.receipt_number,
       ft.id as ledger_id, ft.amount as ledger_amount, ft.is_voided as ledger_voided
from public.fee_payments fp
left join public.finance_transactions ft on ft.fee_payment_id = fp.id
  and ft.school_id = fp.school_id
where fp.school_id = 'SCHOOL-A-UUID'::uuid
  and fp.student_fee_account_id = 'FEE_TEST_ACCOUNT_UUID'::uuid
order by fp.created_at;
```

Expected: no duplicate student/month challan; the two month amounts reflect
the rule in the deployed generator; active payment sums equal account
`amount_paid`; each active payment has one matching nonvoided finance
transaction; denied overpayment adds no row. Any mismatch in cross-session
display or concession handling is a defect to record, not a reason to edit
production data during QA.

## 6. Slow-page latency

Use the same school, role, row counts, region, and route filters before/after
each deployment. In browser DevTools, record at least five navigations per
slow page: document TTFB, total response, LCP, and any route data/RPC request
that dominates the waterfall. Test **Students**, **Attendance**, **Result
Cards** with a full class, **Finance Dashboard**, **Challans**, and **Library**.
Capture cold and warm runs; avoid comparing a warm cache to a cold cache.

For repeatable server-response timings, use a staging session cookie:

```powershell
$env:QA_BASE_URL = 'https://YOUR-STAGING-APP.example'
$env:QA_COOKIE = 'YOUR-SIGNED-IN-COOKIE-HEADER'
$env:QA_ROUTES = '/students,/attendance,/results?view=cards,/finance/dashboard,/finance/challans,/library'
$env:QA_SAMPLES = '5'
node scripts/qa-page-latency.mjs
```

The script reports cold total plus warm p50/p95 TTFB and total HTML time.
It fails on redirects or non-HTML responses, catching expired sessions. It
does not measure hydration or LCP; use DevTools for those. The SQL audit
prints table scan/index counters and whether `pg_stat_statements` is
installed. If installed, replace `EXTENSION_SCHEMA` with the schema from
the SQL audit and run:

```sql
select queryid, calls, round(mean_exec_time::numeric, 1) as mean_ms,
       round(total_exec_time::numeric, 1) as total_ms, rows,
       shared_blks_hit, shared_blks_read
from EXTENSION_SCHEMA.pg_stat_statements
order by total_exec_time desc limit 20;
```

On staging, run `EXPLAIN (ANALYZE, BUFFERS)` for the actual slow queries
using an authenticated connection that enforces RLS. Compare plans, row
estimates, returned row counts, and p95, rather than relying on a single
page load.
