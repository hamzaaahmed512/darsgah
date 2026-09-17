create table if not exists public.class_promotions (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade, source_class_id uuid not null references public.classes(id) on delete cascade, promoted_at timestamptz not null default now(), promoted_by uuid references public.profiles(id) on delete set null, unique(school_id,source_class_id));
alter table public.class_promotions enable row level security;
drop policy if exists class_promotions_read on public.class_promotions;
create policy class_promotions_read on public.class_promotions for select using (app.can_access_school(school_id));
drop policy if exists class_promotions_manage on public.class_promotions;
create policy class_promotions_manage on public.class_promotions for all
using ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), school_id)))
with check ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), school_id)));
