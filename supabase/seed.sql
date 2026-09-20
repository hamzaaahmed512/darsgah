insert into public.schools (id, name, slug, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Alexandria Academy', 'alexandria-academy', 'America/Chicago')
on conflict (id) do update set name = excluded.name;

insert into public.school_settings (school_id, settings)
values ('00000000-0000-0000-0000-000000000001', '{"attendance_edit_window_days":7,"locale":"en-US"}')
on conflict (school_id) do update set settings = excluded.settings;

insert into public.grading_scales (school_id, grade, min_percentage, max_percentage, sort_order) values
('00000000-0000-0000-0000-000000000001', 'A+', 90, 100, 1),
('00000000-0000-0000-0000-000000000001', 'A', 80, 89.99, 2),
('00000000-0000-0000-0000-000000000001', 'B', 70, 79.99, 3),
('00000000-0000-0000-0000-000000000001', 'C', 60, 69.99, 4),
('00000000-0000-0000-0000-000000000001', 'D', 50, 59.99, 5),
('00000000-0000-0000-0000-000000000001', 'F', 0, 49.99, 6)
on conflict (school_id, grade) do nothing;

insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_active) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','2026-2027','2026-08-01','2027-06-15',true)
on conflict (school_id, name) do update set is_active = excluded.is_active;

insert into public.grades (id, school_id, name, sort_order) values
('20000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Grade 9',9),
('20000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Grade 10',10),
('20000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Grade 11',11),
('20000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Grade 12',12)
on conflict (school_id, name) do nothing;

insert into public.sections (id, school_id, name) values
('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Section A'),
('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Section B')
on conflict (school_id, name) do nothing;

insert into public.subjects (id, school_id, name, code) values
('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Mathematics','MATH'),
('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','English Literature','ENG'),
('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Biology','BIO'),
('40000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','History','HIST')
on conflict (school_id, name) do nothing;

-- Demo auth users must exist before classes so head_teacher_id can reference profiles.
do $$
declare
  principal_id uuid := '11111111-1111-1111-1111-111111111111';
  admin_id uuid := '22222222-2222-2222-2222-222222222222';
  teacher_id uuid := '33333333-3333-3333-3333-333333333333';
  staff_id uuid := '44444444-4444-4444-4444-444444444444';
begin
  insert into auth.users (
    id, instance_id, aud, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, role,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, phone_change, phone_change_token,
    reauthentication_token, email_change_token_current,
    is_sso_user, is_anonymous
  )
  values
    (principal_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'principal@scholarly.test', crypt(gen_random_uuid()::text, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', '', '', '', '', '', '', '', '', false, false),
    (admin_id,     '00000000-0000-0000-0000-000000000000', 'authenticated', 'admin@scholarly.test',     crypt(gen_random_uuid()::text, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', '', '', '', '', '', '', '', '', false, false),
    (teacher_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'teacher@scholarly.test',   crypt(gen_random_uuid()::text, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', '', '', '', '', '', '', '', '', false, false),
    (staff_id,     '00000000-0000-0000-0000-000000000000', 'authenticated', 'staff@scholarly.test',     crypt(gen_random_uuid()::text, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', '', '', '', '', '', '', '', '', false, false)
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, email, must_change_password) values
    (principal_id, 'Jane Doe', 'principal@scholarly.test', true),
    (admin_id, 'Avery Admin', 'admin@scholarly.test', true),
    (teacher_id, 'Miles Henderson', 'teacher@scholarly.test', true),
    (staff_id, 'Sam Registrar', 'staff@scholarly.test', true)
  on conflict (id) do update set full_name = excluded.full_name, must_change_password = excluded.must_change_password;

  insert into public.school_members (school_id, user_id, role, department, job_title) values
    ('00000000-0000-0000-0000-000000000001', principal_id, 'principal', 'Leadership', 'Principal'),
    ('00000000-0000-0000-0000-000000000001', admin_id, 'administrator', 'Operations', 'System Administrator'),
    ('00000000-0000-0000-0000-000000000001', teacher_id, 'teacher', 'Mathematics', 'Teacher'),
    ('00000000-0000-0000-0000-000000000001', staff_id, 'student_staff', 'Admissions', 'Registrar')
  on conflict (school_id, user_id) do update set role = excluded.role;
end $$;

insert into public.classes (id, school_id, academic_year_id, grade_id, section_id, name, room, head_teacher_id) values
('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000001','Grade 9A','Room 101','33333333-3333-3333-3333-333333333333'),
('50000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000001','Grade 10A','Room 202','33333333-3333-3333-3333-333333333333'),
('50000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000001','Grade 11A','Room 302','33333333-3333-3333-3333-333333333333'),
('50000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000002','Grade 12B','Room 410','33333333-3333-3333-3333-333333333333')
on conflict (school_id, academic_year_id, name) do nothing;

do $$
declare
  v_student_id uuid;
  v_guardian_id uuid;
  class_ids uuid[] := array[
    '50000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000002'::uuid,
    '50000000-0000-0000-0000-000000000003'::uuid,
    '50000000-0000-0000-0000-000000000004'::uuid
  ];
  first_names text[] := array['Alex','Sarah','Michael','Priya','Noah','Mia','Ethan','Ava','Lucas','Sofia','Liam','Emma','Oliver','Isabella','James','Amelia','Benjamin','Harper','Henry','Evelyn'];
  last_names text[] := array['Rivera','Jenkins','Chen','Patel','Brooks','Stone','Carter','Nguyen','Garcia','Taylor','Wilson','Martinez','Lee','Brown','Davis','Clark','Lewis','Walker','Hall','Young'];
begin
  for i in 1..20 loop
    insert into public.students (
      school_id, admission_number, first_name, last_name, date_of_birth, gender, email, phone, address, admission_date, status
    ) values (
      '00000000-0000-0000-0000-000000000001',
      '2026-' || lpad(i::text, 4, '0'),
      first_names[i],
      last_names[i],
      date '2008-01-01' + (i * interval '41 days'),
      case when i % 2 = 0 then 'Female' else 'Male' end,
      lower(first_names[i] || '.' || last_names[i] || '@scholarly.edu'),
      '+1 (555) 234-' || lpad((5600 + i)::text, 4, '0'),
      (700 + i)::text || ' Maplewood Dr, Springfield, IL',
      date '2026-08-15' - (i * interval '2 days'),
      case when i = 20 then 'archived'::public.student_status else 'active'::public.student_status end
    )
    on conflict (school_id, admission_number) do update set first_name = excluded.first_name
    returning id into v_student_id;

    insert into public.guardians (
      school_id, full_name, relationship, email, phone, emergency_contact_name, emergency_contact_phone
    ) values (
      '00000000-0000-0000-0000-000000000001',
      last_names[i] || ' Guardian',
      case when i % 2 = 0 then 'Mother' else 'Father' end,
      lower(last_names[i] || '.guardian@example.com'),
      '+1 (555) 987-' || lpad((6500 + i)::text, 4, '0'),
      last_names[i] || ' Emergency',
      '+1 (555) 988-' || lpad((6500 + i)::text, 4, '0')
    )
    returning id into v_guardian_id;

    insert into public.student_guardians (school_id, student_id, guardian_id, is_primary)
    values ('00000000-0000-0000-0000-000000000001', v_student_id, v_guardian_id, true)
    on conflict (school_id, student_id, guardian_id) do nothing;

    insert into public.enrollments (school_id, student_id, class_id, academic_year_id, status)
    values ('00000000-0000-0000-0000-000000000001', v_student_id, class_ids[((i - 1) % 4) + 1], '10000000-0000-0000-0000-000000000001', 'active')
    on conflict (school_id, student_id, class_id, academic_year_id) do nothing;
  end loop;
end $$;

insert into public.activity_logs (school_id, action, entity_type, metadata) values
('00000000-0000-0000-0000-000000000001','student_created','student','{"name":"Alex Rivera"}'),
('00000000-0000-0000-0000-000000000001','attendance_submitted','attendance_session','{"class":"Grade 10A","records":20}'),
('00000000-0000-0000-0000-000000000001','settings_changed','school_settings','{"field":"attendance_edit_window_days"}')
on conflict do nothing;

insert into public.teacher_assignments (school_id, teacher_id, class_id, subject_id) values
  ('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001')
on conflict do nothing;

