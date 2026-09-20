create or replace function public.consume_auth_rate_limit(
  p_bucket text, p_key_hash text, p_limit integer, p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_attempts integer;
begin
  if p_bucket not in ('login', 'password_reset', 'parent_login', 'contact_enquiry', 'branding_upload', 'api')
    or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;
  if random() < 0.01 then
    delete from public.auth_rate_limits where started_at < now() - interval '1 day';
  end if;
  insert into public.auth_rate_limits(bucket, key_hash, started_at, attempts)
  values (p_bucket, p_key_hash, now(), 1)
  on conflict (bucket, key_hash) do update set
    attempts = case when auth_rate_limits.started_at <= now() - make_interval(secs => p_window_seconds)
      then 1 else auth_rate_limits.attempts + 1 end,
    started_at = case when auth_rate_limits.started_at <= now() - make_interval(secs => p_window_seconds)
      then now() else auth_rate_limits.started_at end
  returning attempts into v_attempts;
  return v_attempts <= p_limit;
end; $$;
revoke all on function public.consume_auth_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text,text,integer,integer) to service_role;
