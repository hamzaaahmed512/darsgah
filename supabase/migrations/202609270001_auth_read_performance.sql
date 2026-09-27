-- Same authorization expressions; auth.uid() becomes a per-statement initPlan.
-- Preserve roles, command scope, and both USING/WITH CHECK restrictions.
alter policy profiles_select_self_or_school on public.profiles using (
  id = (select auth.uid())
  or exists (
    select 1 from public.school_members mine
    join public.school_members theirs on theirs.school_id = mine.school_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active' and theirs.user_id = profiles.id
  )
);
alter policy profiles_update_self on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- User-first access is not covered by existing school-first composite indexes.
-- Includes inactive memberships because the existing profile policy examines
-- the target member irrespective of status; do not change that policy here.
create index if not exists school_members_user_school_idx
  on public.school_members (user_id, school_id);

-- Matches get_current_app_user's active membership + earliest membership read.
create index if not exists school_members_active_user_created_idx
  on public.school_members (user_id, created_at) include (school_id)
  where status = 'active';

-- Tenant-scoped fee structure list ordered by creation time.
create index if not exists fee_structures_school_created_idx
  on public.fee_structures (school_id, created_at desc);
