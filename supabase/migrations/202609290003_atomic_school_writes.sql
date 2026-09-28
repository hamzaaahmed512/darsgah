-- STU-01/02/03, ATT-01, PAY-01/02. All functions run as the caller so
-- the existing table RLS policies remain the final write authority.

create or replace function public.save_primary_student_guardian(
  p_school_id uuid, p_student_id uuid, p_guardian jsonb
) returns void language plpgsql security invoker set search_path = public as $$
declare v_guardian_id uuid; v_cnic text := nullif(p_guardian->>'cnic','');
begin
  perform 1 from public.students where school_id=p_school_id and id=p_student_id for update;
  if not found then raise exception 'Student not found'; end if;
  if nullif(p_guardian->>'full_name','') is null or nullif(p_guardian->>'phone','') is null then
    raise exception 'Guardian name and phone are required';
  end if;
  if v_cnic is not null then
    select id into v_guardian_id from public.guardians
    where school_id=p_school_id and cnic=v_cnic order by created_at limit 1 for update;
  end if;
  if v_guardian_id is null then
    select guardian_id into v_guardian_id from public.student_guardians
    where school_id=p_school_id and student_id=p_student_id and is_primary limit 1;
  end if;
  if v_guardian_id is null then
    insert into public.guardians(school_id,full_name,relationship,email,phone,cnic)
    values(p_school_id,p_guardian->>'full_name',coalesce(nullif(p_guardian->>'relationship',''),'Father'),
      nullif(p_guardian->>'email',''),p_guardian->>'phone',v_cnic)
    returning id into v_guardian_id;
  else
    update public.guardians set full_name=p_guardian->>'full_name',
      relationship=coalesce(nullif(p_guardian->>'relationship',''),'Father'),
      email=nullif(p_guardian->>'email',''),phone=p_guardian->>'phone',cnic=v_cnic
    where school_id=p_school_id and id=v_guardian_id;
    if not found then raise exception 'Guardian update failed'; end if;
  end if;
  delete from public.student_guardians
  where school_id=p_school_id and student_id=p_student_id and guardian_id<>v_guardian_id;
  insert into public.student_guardians(school_id,student_id,guardian_id,is_primary)
  values(p_school_id,p_student_id,v_guardian_id,true)
  on conflict (school_id,student_id,guardian_id) do update set is_primary=true;
end $$;

create or replace function public.create_student_atomic(
  p_school_id uuid, p_student jsonb, p_guardian jsonb, p_class_id uuid
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_year uuid; v_status public.student_status;
begin
  if not app.has_school_role_key(p_school_id,array['administrator','principal','student_staff']) then
    raise exception 'Not allowed to create students';
  end if;
  v_status := case when app.has_school_role_key(p_school_id,array['student_staff'])
    and not app.has_school_role_key(p_school_id,array['administrator','principal'])
    then 'pending_approval'::public.student_status
    else (p_student->>'status')::public.student_status end;
  if p_class_id is not null then
    select c.academic_year_id into v_year from public.classes c
    join public.academic_years ay on ay.school_id=c.school_id and ay.id=c.academic_year_id
    where c.school_id=p_school_id and c.id=p_class_id and ay.is_active;
    if v_year is null then raise exception 'Requested class or active session not found'; end if;
  end if;
  if v_status='pending_approval' and p_class_id is null then
    raise exception 'Choose a class before submitting an admission for approval';
  end if;
  insert into public.students(school_id,admission_number,student_cnic,guardian_cnic,guardian_phone,
    first_name,last_name,name_en,father_name_en,father_phone,father_cnic,father_alive,
    photo_url,class_id,major,date_of_birth,gender,religion,email,phone,address,admission_date,status)
  values(p_school_id,p_student->>'admission_number',nullif(p_student->>'student_cnic',''),
    nullif(p_student->>'guardian_cnic',''),nullif(p_student->>'guardian_phone',''),
    p_student->>'first_name',p_student->>'last_name',p_student->>'name_en',
    nullif(p_student->>'father_name_en',''),nullif(p_student->>'father_phone',''),
    nullif(p_student->>'father_cnic',''),coalesce((p_student->>'father_alive')::boolean,true),
    nullif(p_student->>'photo_url',''),p_class_id,nullif(p_student->>'major',''),
    (p_student->>'date_of_birth')::date,nullif(p_student->>'gender',''),
    nullif(p_student->>'religion',''),nullif(p_student->>'email',''),
    nullif(p_student->>'phone',''),nullif(p_student->>'address',''),
    coalesce((p_student->>'admission_date')::date,current_date),v_status)
  returning id into v_id;
  perform public.save_primary_student_guardian(p_school_id,v_id,p_guardian);
  if p_class_id is not null then
    if v_status='pending_approval' then
      insert into public.approval_requests(school_id,request_type,student_id,submitted_by,status,metadata)
      values(p_school_id,'admission',v_id,auth.uid(),'pending',jsonb_build_object('requested_class_id',p_class_id));
    else
      insert into public.enrollments(school_id,student_id,class_id,academic_year_id,status)
      values(p_school_id,v_id,p_class_id,v_year,'active');
    end if;
  end if;
  insert into public.activity_logs(school_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_school_id,auth.uid(),case when v_status='pending_approval' then 'admission_request_submitted' else 'student_created' end,
    'student',v_id,jsonb_build_object('admission_number',p_student->>'admission_number'));
  return v_id;
end $$;

create or replace function public.update_student_atomic(
  p_school_id uuid, p_student_id uuid, p_student jsonb, p_guardian jsonb, p_class_id uuid
) returns void language plpgsql security invoker set search_path = public as $$
declare v_year uuid; v_old_class uuid; v_count integer;
begin
  if not app.has_school_role_key(p_school_id,array['administrator','principal','student_staff']) then
    raise exception 'Not allowed to update students';
  end if;
  select class_id into v_old_class from public.students
  where school_id=p_school_id and id=p_student_id for update;
  if not found then raise exception 'Student not found'; end if;
  if p_class_id is not null then
    select c.academic_year_id into v_year from public.classes c
    join public.academic_years ay on ay.school_id=c.school_id and ay.id=c.academic_year_id
    where c.school_id=p_school_id and c.id=p_class_id and ay.is_active;
    if v_year is null then raise exception 'Target class or active session not found'; end if;
  end if;
  update public.students set admission_number=p_student->>'admission_number',
    student_cnic=nullif(p_student->>'student_cnic',''),guardian_cnic=nullif(p_student->>'guardian_cnic',''),
    guardian_phone=nullif(p_student->>'guardian_phone',''),first_name=p_student->>'first_name',
    last_name=p_student->>'last_name',name_en=p_student->>'name_en',
    father_name_en=nullif(p_student->>'father_name_en',''),father_phone=nullif(p_student->>'father_phone',''),
    father_cnic=nullif(p_student->>'father_cnic',''),father_alive=coalesce((p_student->>'father_alive')::boolean,true),
    photo_url=nullif(p_student->>'photo_url',''),class_id=p_class_id,major=nullif(p_student->>'major',''),
    date_of_birth=(p_student->>'date_of_birth')::date,gender=nullif(p_student->>'gender',''),
    religion=nullif(p_student->>'religion',''),email=nullif(p_student->>'email',''),
    phone=nullif(p_student->>'phone',''),address=nullif(p_student->>'address',''),
    admission_date=(p_student->>'admission_date')::date,status=(p_student->>'status')::public.student_status
  where school_id=p_school_id and id=p_student_id;
  get diagnostics v_count = row_count;
  if v_count<>1 then raise exception 'Student update failed'; end if;
  perform public.save_primary_student_guardian(p_school_id,p_student_id,p_guardian);
  update public.enrollments set status='withdrawn',
    ends_on=case when starts_on<current_date then current_date-1 else current_date end
  where school_id=p_school_id and student_id=p_student_id and status='active'
    and (p_class_id is null or class_id<>p_class_id or academic_year_id is distinct from v_year);
  if p_class_id is not null and not exists (
    select 1 from public.enrollments where school_id=p_school_id and student_id=p_student_id
      and class_id=p_class_id and academic_year_id=v_year and status='active'
  ) then
    insert into public.enrollments(school_id,student_id,class_id,academic_year_id,status,starts_on,ends_on)
    values(p_school_id,p_student_id,p_class_id,v_year,'active',current_date,null)
    on conflict (school_id,student_id,class_id,academic_year_id) do update
      set status='active',ends_on=null;
  end if;
  insert into public.activity_logs(school_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_school_id,auth.uid(),'student_updated','student',p_student_id,
    jsonb_build_object('admission_number',p_student->>'admission_number'));
end $$;

create or replace function public.review_approval_request_atomic(
  p_school_id uuid, p_request_id uuid, p_decision text, p_denial_reason text default null
) returns void language plpgsql security invoker set search_path = public as $$
declare v_request public.approval_requests%rowtype; v_class_id uuid; v_year uuid; v_count integer;
begin
  if not app.has_school_role_key(p_school_id,array['principal','administrator']) then
    raise exception 'Not allowed to review requests';
  end if;
  if p_decision not in ('approved','denied') then raise exception 'Invalid review decision'; end if;
  select * into v_request from public.approval_requests
  where school_id=p_school_id and id=p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status<>'pending' then raise exception 'Request has already been reviewed'; end if;
  if p_decision='approved' and v_request.request_type='admission' then
    if coalesce(v_request.metadata->>'requested_class_id','') !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'Requested class is missing or invalid; request remains pending';
    end if;
    v_class_id := (v_request.metadata->>'requested_class_id')::uuid;
    select c.academic_year_id into v_year from public.classes c
    join public.academic_years ay on ay.school_id=c.school_id and ay.id=c.academic_year_id
    where c.school_id=p_school_id and c.id=v_class_id and ay.is_active;
    if v_year is null then raise exception 'Requested class or active session is invalid; request remains pending'; end if;
  end if;
  update public.students set status=case
      when p_decision='approved' and v_request.request_type='admission' then 'active'::public.student_status
      when p_decision='approved' then 'cancelled'::public.student_status
      when v_request.request_type='admission' then 'pending_approval'::public.student_status
      else 'active'::public.student_status end,
    archived_at=case when p_decision='approved' and v_request.request_type='cancellation' then now() else archived_at end
  where school_id=p_school_id and id=v_request.student_id;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Student status update failed'; end if;
  if p_decision='approved' and v_request.request_type='cancellation' then
    update public.enrollments set status='withdrawn',
      ends_on=case when starts_on<current_date then current_date-1 else current_date end
    where school_id=p_school_id and student_id=v_request.student_id and status='active';
  elsif p_decision='approved' and v_request.request_type='admission' then
    insert into public.enrollments(school_id,student_id,class_id,academic_year_id,status)
    values(p_school_id,v_request.student_id,v_class_id,v_year,'active');
  end if;
  update public.approval_requests set status=p_decision::public.approval_request_status,
    reviewed_by=auth.uid(),reviewed_at=now(),
    denial_reason=case when p_decision='denied' then p_denial_reason else null end
  where school_id=p_school_id and id=p_request_id and status='pending';
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Request closure failed'; end if;
  insert into public.activity_logs(school_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_school_id,auth.uid(),'request_'||p_decision,'approval_request',p_request_id,
    jsonb_build_object('request_type',v_request.request_type));
end $$;

revoke all on function public.save_primary_student_guardian(uuid,uuid,jsonb) from public;
revoke all on function public.create_student_atomic(uuid,jsonb,jsonb,uuid) from public;
revoke all on function public.update_student_atomic(uuid,uuid,jsonb,jsonb,uuid) from public;
revoke all on function public.review_approval_request_atomic(uuid,uuid,text,text) from public;
grant execute on function public.save_primary_student_guardian(uuid,uuid,jsonb) to authenticated;
grant execute on function public.create_student_atomic(uuid,jsonb,jsonb,uuid) to authenticated;
grant execute on function public.update_student_atomic(uuid,uuid,jsonb,jsonb,uuid) to authenticated;
grant execute on function public.review_approval_request_atomic(uuid,uuid,text,text) to authenticated;

create or replace function public.submit_attendance_atomic(
  p_school_id uuid, p_class_id uuid, p_attendance_date date, p_records jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_class public.classes%rowtype; v_session public.attendance_sessions%rowtype;
  v_record jsonb; v_ids uuid[] := '{}'; v_student_id uuid; v_count integer;
begin
  if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)=0 then
    raise exception 'At least one attendance record is required';
  end if;
  select * into v_class from public.classes where school_id=p_school_id and id=p_class_id;
  if not found then raise exception 'Class not found'; end if;
  select * into v_session from public.attendance_sessions
  where school_id=p_school_id and class_id=p_class_id and attendance_date=p_attendance_date for update;
  if found then
    if v_session.status<>'submitted' or v_session.reopened_at is null
      or v_session.reopened_at<now()-interval '24 hours' then
      raise exception 'Attendance is not open for editing. Ask the principal to reopen it';
    end if;
    if v_session.reopened_by is distinct from auth.uid() or
      (v_class.head_teacher_id is distinct from auth.uid()
        and not app.has_school_role_key(p_school_id,array['principal'])) then
      raise exception 'Attendance is not open for editing for this user';
    end if;
  else
    if v_class.head_teacher_id is distinct from auth.uid() then
      raise exception 'Only the head teacher can mark attendance';
    end if;
    insert into public.attendance_sessions(school_id,class_id,attendance_date,submitted_by,submitted_at,status)
    values(p_school_id,p_class_id,p_attendance_date,auth.uid(),now(),'submitted') returning * into v_session;
  end if;
  for v_record in select value from jsonb_array_elements(p_records) loop
    v_student_id := (v_record->>'student_id')::uuid;
    if v_student_id=any(v_ids) then raise exception 'Duplicate student in attendance submission'; end if;
    v_ids := array_append(v_ids,v_student_id);
    if not exists (
      select 1 from public.enrollments e where e.school_id=p_school_id
        and e.student_id=v_student_id and e.class_id=p_class_id
        and e.starts_on<=p_attendance_date and (e.ends_on is null or e.ends_on>=p_attendance_date)
        and (e.status='active' or e.ends_on is not null)
    ) then raise exception 'Attendance student is not enrolled in this class on the selected date'; end if;
    insert into public.attendance_records(school_id,session_id,class_id,student_id,attendance_date,status,note,recorded_by)
    values(p_school_id,v_session.id,p_class_id,v_student_id,p_attendance_date,
      (v_record->>'status')::public.attendance_status,nullif(v_record->>'note',''),auth.uid())
    on conflict (school_id,student_id,class_id,attendance_date) do update
      set status=excluded.status,note=excluded.note,recorded_by=excluded.recorded_by,
        session_id=excluded.session_id;
  end loop;
  if v_session.reopened_at is not null then
    update public.attendance_sessions set status='submitted',submitted_at=now(),submitted_by=auth.uid(),
      reopened_at=null,reopened_by=null where school_id=p_school_id and id=v_session.id;
    get diagnostics v_count=row_count;
    if v_count<>1 then raise exception 'Attendance session update failed'; end if;
  end if;
  insert into public.activity_logs(school_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_school_id,auth.uid(),case when v_session.reopened_at is null then 'attendance_submitted' else 'attendance_resubmitted' end,
    'attendance_session',v_session.id,
    jsonb_build_object('class_id',p_class_id,'attendance_date',p_attendance_date,'records',jsonb_array_length(p_records)));
  return v_session.id;
end $$;

create or replace function public.save_staff_pay_atomic(
  p_school_id uuid, p_staff_id uuid, p_month text, p_base_salary numeric,
  p_bonus numeric, p_deduction numeric, p_remarks text default null
) returns void language plpgsql security invoker set search_path = public as $$
declare v_effective_date date; v_current_or_future boolean; v_old_salary numeric;
  v_payroll public.payroll%rowtype; v_other public.other_staff_records%rowtype;
  v_employment public.teacher_employment_details%rowtype; v_net numeric;
begin
  if not app.has_school_role_key(p_school_id,array['administrator','principal','cashier']) then
    raise exception 'Not allowed to manage payroll';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text||':'||p_staff_id::text,0));
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Month must use YYYY-MM'; end if;
  if p_base_salary is null or p_base_salary<=0 or p_bonus is null or p_bonus<0
    or p_deduction is null or p_deduction<0 then raise exception 'Invalid salary amounts'; end if;
  v_effective_date := (p_month||'-01')::date;
  v_current_or_future := v_effective_date>=date_trunc('month',current_date)::date;
  v_net := greatest(0,p_base_salary+p_bonus-p_deduction);
  select * into v_other from public.other_staff_records
  where school_id=p_school_id and id=p_staff_id and status='active' for update;
  if found then
    select * into v_payroll from public.payroll
    where school_id=p_school_id and other_staff_id=p_staff_id and month=p_month for update;
    if v_payroll.status='paid' then raise exception 'Mark this salary as unpaid before editing it'; end if;
    v_old_salary := coalesce(v_other.monthly_salary,0);
    if v_current_or_future and v_old_salary<>p_base_salary then
      update public.other_staff_records set monthly_salary=p_base_salary
      where school_id=p_school_id and id=p_staff_id;
      if not found then raise exception 'Staff salary update failed'; end if;
      insert into public.salary_history(school_id,other_staff_id,previous_salary,new_salary,
        action_type,effective_date,approved_by,remarks)
      values(p_school_id,p_staff_id,v_old_salary,p_base_salary,
        case when v_old_salary=0 then 'initial' when p_base_salary>v_old_salary then 'increase' else 'decrease' end,
        v_effective_date,auth.uid(),p_remarks);
    end if;
    if v_payroll.id is null then
      insert into public.payroll(school_id,other_staff_id,month,base_salary,total_bonus,total_deductions,
        net_salary,status,payment_date,approved_by,remarks)
      values(p_school_id,p_staff_id,p_month,p_base_salary,p_bonus,p_deduction,v_net,
        'generated',null,auth.uid(),p_remarks);
    else
      update public.payroll set base_salary=p_base_salary,total_bonus=p_bonus,total_deductions=p_deduction,
        net_salary=v_net,status='generated',payment_date=null,approved_by=auth.uid(),remarks=p_remarks
      where school_id=p_school_id and id=v_payroll.id;
      if not found then raise exception 'Payroll update failed'; end if;
    end if;
    return;
  end if;
  perform 1 from public.school_members
  where school_id=p_school_id and user_id=p_staff_id;
  if not found then raise exception 'Staff member not found'; end if;
  select * into v_employment from public.teacher_employment_details
  where school_id=p_school_id and teacher_id=p_staff_id for update;
  select * into v_payroll from public.payroll
  where school_id=p_school_id and teacher_id=p_staff_id and month=p_month for update;
  if v_payroll.status='paid' then raise exception 'Mark this salary as unpaid before editing it'; end if;
  v_old_salary := coalesce(v_employment.monthly_salary,0);
  if v_current_or_future then
    insert into public.teacher_employment_details(teacher_id,school_id,designation,department,
      joining_date,monthly_salary,payment_method,salary_start_date,employment_status)
    values(p_staff_id,p_school_id,v_employment.designation,v_employment.department,
      coalesce(v_employment.joining_date,v_effective_date),p_base_salary,
      coalesce(v_employment.payment_method,'cash'),
      case when v_old_salary<>p_base_salary then v_effective_date else coalesce(v_employment.salary_start_date,v_effective_date) end,
      coalesce(v_employment.employment_status,'active'))
    on conflict (teacher_id) do update set monthly_salary=excluded.monthly_salary,
      salary_start_date=excluded.salary_start_date;
    if v_old_salary<>p_base_salary then
      insert into public.salary_history(school_id,teacher_id,previous_salary,new_salary,
        action_type,effective_date,approved_by,remarks)
      values(p_school_id,p_staff_id,v_old_salary,p_base_salary,
        case when v_old_salary=0 then 'initial' when p_base_salary>v_old_salary then 'increase' else 'decrease' end,
        v_effective_date,auth.uid(),p_remarks);
    end if;
  end if;
  insert into public.payroll(school_id,teacher_id,month,base_salary,total_bonus,total_deductions,
    net_salary,status,payment_date,approved_by,remarks)
  values(p_school_id,p_staff_id,p_month,p_base_salary,p_bonus,p_deduction,v_net,
    'generated',null,auth.uid(),p_remarks)
  on conflict (school_id,teacher_id,month) do update set base_salary=excluded.base_salary,
    total_bonus=excluded.total_bonus,total_deductions=excluded.total_deductions,net_salary=excluded.net_salary,
    status='generated',payment_date=null,approved_by=excluded.approved_by,remarks=excluded.remarks;
end $$;

revoke all on function public.submit_attendance_atomic(uuid,uuid,date,jsonb) from public;
revoke all on function public.save_staff_pay_atomic(uuid,uuid,text,numeric,numeric,numeric,text) from public;
grant execute on function public.submit_attendance_atomic(uuid,uuid,date,jsonb) to authenticated;
grant execute on function public.save_staff_pay_atomic(uuid,uuid,text,numeric,numeric,numeric,text) to authenticated;

notify pgrst, 'reload schema';
