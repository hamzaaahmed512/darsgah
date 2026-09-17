-- Collapse the hottest application read paths into compact, authorized RPCs.
-- This removes network waterfalls without weakening tenant isolation.

create or replace function public.get_current_app_user()
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  must_change_password boolean,
  school_id uuid,
  school_name text,
  role public.app_role,
  department text,
  job_title text,
  custom_role_id uuid,
  permissions text[],
  school_logo_url text,
  school_favicon_url text
)
language sql
stable
security definer
set search_path = public, app
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.must_change_password,
    sm.school_id,
    s.name,
    sm.role,
    sm.department,
    sm.job_title,
    sm.custom_role_id,
    app.get_resolved_permissions(p.id, sm.school_id),
    case when jsonb_typeof(ss.settings -> 'schoolLogoUrl') = 'string'
      then ss.settings ->> 'schoolLogoUrl' end,
    case when jsonb_typeof(ss.settings -> 'schoolFaviconUrl') = 'string'
      then ss.settings ->> 'schoolFaviconUrl' end
  from public.profiles p
  join public.school_members sm
    on sm.user_id = p.id and sm.status = 'active'
  join public.schools s on s.id = sm.school_id
  left join public.school_settings ss on ss.school_id = sm.school_id
  where p.id = (select auth.uid())
  order by sm.created_at
  limit 1;
$$;

revoke all on function public.get_current_app_user() from public, anon;
grant execute on function public.get_current_app_user() to authenticated;

create or replace function public.get_school_dashboard(p_school_id uuid, p_from date, p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, app
as $$
declare
  result jsonb;
begin
  if not app.can_access_school(p_school_id) then
    raise exception 'Not authorized to access this school.';
  end if;

  select jsonb_build_object(
    'totalStudents', (select count(*) from public.students where school_id = p_school_id and status = 'active'),
    'totalTeachers', (select count(*) from public.school_members where school_id = p_school_id and role = 'teacher' and status = 'active'),
    'totalStaff', (select count(*) from public.school_members where school_id = p_school_id and status = 'active'),
    'absentToday', (select count(*) from public.attendance_records where school_id = p_school_id and attendance_date = p_today and status in ('absent', 'late')),
    'attendanceRate', (
      select case when count(*) = 0 then null
        else count(*) filter (where status in ('present', 'late'))::numeric * 100 / count(*) end
      from public.attendance_records
      where school_id = p_school_id and attendance_date >= p_from
    ),
    'recentAdmissions', coalesce((
      select jsonb_agg(to_jsonb(recent) order by recent.admission_date desc)
      from (
        select id, first_name, last_name, admission_number, admission_date
        from public.students
        where school_id = p_school_id and admission_date >= p_from
        order by admission_date desc
        limit 5
      ) recent
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(to_jsonb(recent_activity) order by recent_activity.created_at desc)
      from (
        select al.id, al.action, al.entity_type, al.created_at, al.metadata,
          case when p.id is null then null else jsonb_build_object('full_name', p.full_name) end as profiles
        from public.activity_logs al
        left join public.profiles p on p.id = al.actor_id
        where al.school_id = p_school_id
        order by al.created_at desc
        limit 8
      ) recent_activity
    ), '[]'::jsonb),
    'attendanceTrend', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', attendance_date,
        'attendance', round(present_count::numeric * 100 / nullif(total_count, 0))
      ) order by attendance_date)
      from (
        select attendance_date, count(*) as total_count,
          count(*) filter (where status in ('present', 'late')) as present_count
        from public.attendance_records
        where school_id = p_school_id and attendance_date >= p_from
        group by attendance_date
      ) daily
    ), '[]'::jsonb),
    'classDistribution', coalesce((
      select jsonb_agg(to_jsonb(distribution) order by distribution.grade_name)
      from (
        select c.name as class_name, g.name as grade_name, count(e.id)::int as student_count
        from public.classes c
        join public.grades g on g.id = c.grade_id
        left join public.enrollments e on e.class_id = c.id and e.status = 'active'
        where c.school_id = p_school_id
        group by c.id, c.name, g.name
      ) distribution
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_school_dashboard(uuid, date, date) from public, anon;
grant execute on function public.get_school_dashboard(uuid, date, date) to authenticated;

create or replace function public.get_finance_dashboard(p_school_id uuid, p_month_start date, p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, app
as $$
declare
  result jsonb;
begin
  if not app.can_access_school(p_school_id) then
    raise exception 'Not authorized to access this school.';
  end if;

  with account_totals as (
    select
      coalesce(sum(total_payable), 0) as expected,
      coalesce(sum(amount_paid), 0) as collected,
      coalesce(sum(greatest(total_payable - amount_paid, 0)), 0) as outstanding,
      count(*) filter (where amount_paid < total_payable and not (total_payable > 0 and current_date > due_date)) as pending_count,
      count(*) filter (where amount_paid < total_payable and total_payable > 0 and current_date > due_date) as overdue_count,
      coalesce(sum(case
        when discount_type = 'fixed' then discount_value
        when discount_type = 'percentage' and discount_value > 0 and discount_value < 100
          then (total_payable / (1 - discount_value / 100)) * (discount_value / 100)
        else 0 end), 0) as discounts
    from public.student_fee_accounts
    where school_id = p_school_id
  ), payment_totals as (
    select
      coalesce(sum(amount) filter (where payment_date = p_today), 0) as today_collection,
      coalesce(sum(amount), 0) as monthly_collection
    from public.fee_payments
    where school_id = p_school_id and not is_voided and payment_date >= p_month_start
  )
  select jsonb_build_object(
    'totalExpected', a.expected,
    'totalCollected', a.collected,
    'totalOutstanding', a.outstanding,
    'todayCollection', p.today_collection,
    'monthlyCollection', p.monthly_collection,
    'totalDiscounts', a.discounts,
    'pendingPayments', a.pending_count,
    'overduePayments', a.overdue_count,
    'collectionMethodData', coalesce((
      select jsonb_agg(jsonb_build_object('name', replace(payment_method, '_', ' '), 'value', amount) order by amount desc)
      from (
        select payment_method, sum(amount) as amount
        from public.fee_payments
        where school_id = p_school_id and not is_voided and payment_date >= p_month_start
        group by payment_method
      ) methods
    ), '[]'::jsonb),
    'outstandingByClass', coalesce((
      select jsonb_agg(jsonb_build_object('className', class_name, 'amount', amount) order by amount desc)
      from (
        select c.name as class_name, sum(greatest(sfa.total_payable - sfa.amount_paid, 0)) as amount
        from public.student_fee_accounts sfa
        join public.classes c on c.id = sfa.class_id
        where sfa.school_id = p_school_id
        group by c.id, c.name
        order by amount desc
        limit 5
      ) classes
    ), '[]'::jsonb),
    'recentPayments', coalesce((
      select jsonb_agg(to_jsonb(recent) order by recent.created_at desc)
      from (
        select * from public.payment_history_view
        where school_id = p_school_id
        order by created_at desc
        limit 5
      ) recent
    ), '[]'::jsonb)
  ) into result
  from account_totals a cross join payment_totals p;

  return result;
end;
$$;

revoke all on function public.get_finance_dashboard(uuid, date, date) from public, anon;
grant execute on function public.get_finance_dashboard(uuid, date, date) to authenticated;

create index if not exists announcements_school_active_publish_idx
  on public.announcements (school_id, is_archived, publish_date, created_at desc);
