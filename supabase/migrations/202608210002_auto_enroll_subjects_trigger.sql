-- Trigger to automatically enroll students into the class's subjects when they are enrolled in the class.
create or replace function public.auto_enroll_class_subjects()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' then
    insert into public.student_subject_enrollments (school_id, student_id, subject_id, class_id)
    select ta.school_id, new.student_id, ta.subject_id, new.class_id
    from public.teacher_assignments ta
    where ta.school_id = new.school_id
      and ta.class_id = new.class_id
      and ta.subject_id is not null
    on conflict (school_id, student_id, subject_id, class_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists enrollments_auto_enroll_subjects on public.enrollments;
create trigger enrollments_auto_enroll_subjects
after insert on public.enrollments
for each row execute function public.auto_enroll_class_subjects();
