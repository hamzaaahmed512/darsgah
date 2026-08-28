update public.profiles
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

update public.profiles
set personal_email = lower(trim(personal_email))
where personal_email is not null and personal_email <> lower(trim(personal_email));

update public.students
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

update public.guardians
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

update public.platform_admins
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

update public.schools
set contact_email = lower(trim(contact_email))
where contact_email is not null and contact_email <> lower(trim(contact_email));

update public.school_settings
set settings = jsonb_set(settings, '{schoolEmail}', to_jsonb(lower(trim(settings ->> 'schoolEmail'))), true)
where jsonb_typeof(settings -> 'schoolEmail') = 'string'
  and settings ->> 'schoolEmail' <> lower(trim(settings ->> 'schoolEmail'));

update auth.users
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_email_lowercase_chk') then
    alter table public.profiles
      add constraint profiles_email_lowercase_chk
      check (email is null or email = lower(trim(email)));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_personal_email_lowercase_chk') then
    alter table public.profiles
      add constraint profiles_personal_email_lowercase_chk
      check (personal_email is null or personal_email = lower(trim(personal_email)));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'students_email_lowercase_chk') then
    alter table public.students
      add constraint students_email_lowercase_chk
      check (email is null or email = lower(trim(email)));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'guardians_email_lowercase_chk') then
    alter table public.guardians
      add constraint guardians_email_lowercase_chk
      check (email is null or email = lower(trim(email)));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'platform_admins_email_lowercase_chk') then
    alter table public.platform_admins
      add constraint platform_admins_email_lowercase_chk
      check (email = lower(trim(email)));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'schools_contact_email_lowercase_chk') then
    alter table public.schools
      add constraint schools_contact_email_lowercase_chk
      check (contact_email is null or contact_email = lower(trim(contact_email)));
  end if;
end $$;
