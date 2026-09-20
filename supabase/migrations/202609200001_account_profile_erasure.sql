-- Called only with the service role after the user re-enters their password.
-- Keep school records that have legal or operational references, but remove
-- identity fields and free-form metadata owned by the account.
create or replace function public.erase_account_profile(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    full_name = 'Deleted account', email = null, avatar_url = null,
    phone = null, personal_email = null, address = null,
    emergency_contact_name = null, emergency_contact_phone = null,
    cnic = null, gender = null, bio = null
  where id = p_user_id and email = p_email;
  if not found then raise exception 'Account profile not found'; end if;

  update public.school_members set status = 'inactive', department = null, job_title = null
  where user_id = p_user_id;
  update public.activity_logs set metadata = '{}'::jsonb where actor_id = p_user_id;
  update public.platform_audit_logs set details = '{}'::jsonb where actor_user_id = p_user_id;
  delete from public.announcement_reads where user_id = p_user_id;
  update public.platform_admins set
    email = 'deleted-' || gen_random_uuid()::text || '@example.invalid',
    full_name = 'Deleted account', status = 'disabled'
  where user_id = p_user_id;
  update public.schools set contact_name = null, contact_email = null
  where contact_email = p_email and id in (
    select school_id from public.school_members where user_id = p_user_id
  );
end;
$$;

revoke all on function public.erase_account_profile(uuid, text) from public, anon, authenticated;
grant execute on function public.erase_account_profile(uuid, text) to service_role;
