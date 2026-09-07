-- Upgrade library reporting RPCs to support decision-focused reports dashboard

create or replace function public.library_loans_detailed(p_school_id uuid)
returns table(
  id uuid,
  copy_id uuid,
  borrower_name text,
  borrower_kind text,
  borrower_id uuid,
  issued_at timestamptz,
  due_date date,
  returned_at timestamptz,
  outcome text,
  renewals int,
  fine_per_day numeric,
  fine_amount numeric,
  paid_amount numeric,
  waived_amount numeric,
  book_id uuid,
  book_title text,
  book_category text,
  accession text,
  student_grade_id uuid,
  student_grade_name text,
  student_section_id uuid,
  student_section_name text,
  student_registration_number text,
  staff_id text,
  staff_department text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.library_allowed(p_school_id, 'library:view') then
    raise exception 'Library access denied';
  end if;

  return query
  select
    l.id,
    l.copy_id,
    l.borrower_name,
    l.borrower_kind,
    l.borrower_id,
    l.issued_at,
    l.due_date,
    l.returned_at,
    l.outcome,
    l.renewals,
    l.fine_per_day,
    l.fine_amount,
    l.paid_amount,
    l.waived_amount,
    c.book_id,
    b.title as book_title,
    b.category as book_category,
    c.accession,
    case when l.borrower_kind = 'student' then st.grade_id else null end as student_grade_id,
    case when l.borrower_kind = 'student' then g.name else null end as student_grade_name,
    case when l.borrower_kind = 'student' then st.section_id else null end as student_section_id,
    case when l.borrower_kind = 'student' then sec.name else null end as student_section_name,
    case when l.borrower_kind = 'student' then st.admission_number::text else null end as student_registration_number,
    case when l.borrower_kind = 'staff' then stf.member_id::text else null end as staff_id,
    case when l.borrower_kind = 'staff' then stf.department else null end as staff_department
  from public.library_loans l
  join public.library_copies c on c.id = l.copy_id
  join public.library_books b on b.id = c.book_id
  left join public.students st on (l.borrower_kind = 'student' and st.id = l.borrower_id and st.school_id = p_school_id)
  left join public.grades g on g.id = st.grade_id
  left join public.sections sec on sec.id = st.section_id
  left join public.staff_directory stf on (l.borrower_kind = 'staff' and stf.user_id = l.borrower_id and stf.school_id = p_school_id)
  where l.school_id = p_school_id
  order by l.issued_at desc;
end; $$;

revoke all on function public.library_loans_detailed(uuid) from public, anon;
grant execute on function public.library_loans_detailed(uuid) to authenticated;
