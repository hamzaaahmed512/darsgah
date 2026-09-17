-- School-scoped library. All writes go through the transactional RPC below.
create table public.library_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  loan_days integer not null default 14 check (loan_days between 1 and 90),
  max_loans integer not null default 3 check (max_loans between 1 and 30),
  max_renewals integer not null default 2 check (max_renewals between 0 and 10),
  fine_per_day numeric(10,2) not null default 0 check (fine_per_day between 0 and 10000)
);
create table public.library_books (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  author text not null check (length(trim(author)) between 1 and 200),
  isbn text not null default '' check (length(isbn) <= 32),
  category text not null default '' check (length(category) <= 80),
  publisher text not null default '' check (length(publisher) <= 200),
  shelf text not null default '' check (length(shelf) <= 80),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(school_id,id)
);
create table public.library_copies (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  book_id uuid not null,
  accession text not null check (length(trim(accession)) between 1 and 80),
  status text not null default 'available' check (status in ('available','on_loan','damaged','lost','withdrawn')),
  replacement_cost numeric(10,2) not null default 0 check (replacement_cost between 0 and 1000000),
  unique(school_id,id), unique(school_id,accession),
  foreign key(school_id,book_id) references public.library_books(school_id,id)
);
create table public.library_loans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  copy_id uuid not null,
  borrower_kind text not null check (borrower_kind in ('student','staff')),
  borrower_id uuid not null,
  borrower_name text not null,
  issued_at timestamptz not null default now(),
  due_date date not null,
  returned_at timestamptz,
  outcome text check (outcome in ('returned','damaged','lost')),
  renewals integer not null default 0,
  fine_per_day numeric(10,2) not null,
  fine_amount numeric(12,2) not null default 0 check (fine_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  waived_amount numeric(12,2) not null default 0 check (waived_amount >= 0),
  check (paid_amount + waived_amount <= fine_amount),
  check ((returned_at is null and outcome is null) or (returned_at is not null and outcome is not null)),
  foreign key(school_id,copy_id) references public.library_copies(school_id,id)
);
create unique index library_one_open_loan on public.library_loans(copy_id) where returned_at is null;
create index library_loans_borrower on public.library_loans(school_id,borrower_id) where returned_at is null;
create index library_loans_due on public.library_loans(school_id,due_date) where returned_at is null;
create table public.library_reservations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  book_id uuid not null,
  borrower_kind text not null check (borrower_kind in ('student','staff')),
  borrower_id uuid not null,
  borrower_name text not null,
  status text not null default 'waiting' check (status in ('waiting','fulfilled','cancelled')),
  created_at timestamptz not null default now(),
  foreign key(school_id,book_id) references public.library_books(school_id,id)
);
create unique index library_one_reservation on public.library_reservations(school_id,book_id,borrower_kind,borrower_id) where status = 'waiting';
create table public.library_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

create function public.library_seed_school() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.library_settings(school_id) values(new.id) on conflict do nothing;
  insert into public.role_permissions(school_id,role_key,permission,granted)
  select new.id,r,p,true from unnest(array['principal','administrator','librarian']) r
  cross join unnest(array['library:view','library:manage']) p on conflict do nothing;
  insert into public.role_permissions(school_id,role_key,permission,granted)
  select new.id,'librarian',p,true from unnest(array['dashboard:view','leave:view','announcements:view']) p on conflict do nothing;
  return new;
end; $$;
create trigger library_new_school after insert on public.schools for each row execute function public.library_seed_school();
insert into public.library_settings(school_id) select id from public.schools;
insert into public.role_permissions(school_id,role_key,permission,granted)
select s.id,r,p,true from public.schools s cross join unnest(array['principal','administrator','librarian']) r
cross join unnest(array['library:view','library:manage']) p on conflict do nothing;
insert into public.role_permissions(school_id,role_key,permission,granted)
select s.id,'librarian',p,true from public.schools s cross join unnest(array['dashboard:view','leave:view','announcements:view']) p on conflict do nothing;

create function public.library_allowed(p_school_id uuid,p_permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and p_permission = any(app.get_resolved_permissions(auth.uid(),p_school_id));
$$;
do $$ declare t text; begin
  foreach t in array array['library_settings','library_books','library_copies','library_loans','library_reservations','library_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy library_read on public.%I for select to authenticated using (public.library_allowed(school_id,''library:view''))',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;

-- Only expose the identifiers needed at the circulation desk, not full student/staff profiles.
create function public.library_borrowers(p_school_id uuid) returns table(id uuid,kind text,name text,reference text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.library_allowed(p_school_id,'library:view') then raise exception 'Library access denied'; end if;
  return query select s.id,'student'::text,concat_ws(' ',s.first_name,s.last_name),s.admission_number::text
    from public.students s where s.school_id=p_school_id and s.status='active'
    union all select m.user_id,'staff'::text,p.full_name,m.role::text
    from public.school_members m join public.profiles p on p.id=m.user_id where m.school_id=p_school_id and m.status='active';
end; $$;

create function public.library_mutate(p_school_id uuid,p_action text,p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_settings public.library_settings%rowtype;
  v_copy public.library_copies%rowtype;
  v_loan public.library_loans%rowtype;
  v_res public.library_reservations%rowtype;
  v_id uuid; v_book uuid; v_borrower uuid; v_name text; v_kind text; v_due date; v_status text; v_amount numeric;
begin
  if not public.library_allowed(p_school_id,'library:manage') then raise exception 'Library management access denied'; end if;
  -- A school-level transaction lock serializes circulation, stock and policy changes.
  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text, 607));
  select * into strict v_settings from public.library_settings where school_id=p_school_id;
  v_id := nullif(p_data->>'id','')::uuid;
  if p_action in ('issue','reserve') then
    v_kind := p_data->>'borrower_kind'; v_borrower := (p_data->>'borrower_id')::uuid;
    select b.name into v_name from public.library_borrowers(p_school_id) b where b.id=v_borrower and b.kind=v_kind;
    if v_name is null then raise exception 'Select an active borrower from this school'; end if;
  end if;
  if p_action in ('book','edit_book') then
    if p_action='book' then
      insert into public.library_books(school_id,title,author,isbn,category,publisher,shelf)
      values(p_school_id,trim(p_data->>'title'),trim(p_data->>'author'),trim(p_data->>'isbn'),trim(p_data->>'category'),trim(p_data->>'publisher'),trim(p_data->>'shelf'));
    else
      update public.library_books set title=trim(p_data->>'title'),author=trim(p_data->>'author'),isbn=trim(p_data->>'isbn'),
        category=trim(p_data->>'category'),publisher=trim(p_data->>'publisher'),shelf=trim(p_data->>'shelf') where school_id=p_school_id and id=v_id;
      if not found then raise exception 'Book not found'; end if;
    end if;
  elsif p_action='copy' then
    v_book := (p_data->>'book_id')::uuid;
    if not exists(select 1 from public.library_books where school_id=p_school_id and id=v_book and not archived) then raise exception 'Select an active title'; end if;
    insert into public.library_copies(school_id,book_id,accession,replacement_cost)
      values(p_school_id,v_book,upper(trim(p_data->>'accession')),(p_data->>'replacement_cost')::numeric);
  elsif p_action='archive' then
    if exists(select 1 from public.library_copies where school_id=p_school_id and book_id=v_id and status='on_loan')
      or exists(select 1 from public.library_reservations where school_id=p_school_id and book_id=v_id and status='waiting') then
      raise exception 'Resolve open loans and reservations before archiving'; end if;
    update public.library_books set archived=(p_data->>'archived')::boolean where school_id=p_school_id and id=v_id;
    if not found then raise exception 'Book not found'; end if;
  elsif p_action='copy_status' then
    v_status := p_data->>'status';
    if v_status not in ('available','damaged','lost','withdrawn') or v_status is null then raise exception 'Invalid copy status'; end if;
    update public.library_copies set status=v_status where school_id=p_school_id and id=v_id and status<>'on_loan';
    if not found then raise exception 'Copy unavailable; close its loan first'; end if;
  elsif p_action='issue' then
    select * into v_copy from public.library_copies where school_id=p_school_id and id=(p_data->>'copy_id')::uuid for update;
    if not found or v_copy.status<>'available' then raise exception 'This copy is no longer available'; end if;
    if exists(select 1 from public.library_books where school_id=p_school_id and id=v_copy.book_id and archived) then raise exception 'This title is archived'; end if;
    if (select count(*) from public.library_loans where school_id=p_school_id and borrower_kind=v_kind and borrower_id=v_borrower and returned_at is null)>=v_settings.max_loans then raise exception 'Borrower has reached the loan limit'; end if;
    if exists(select 1 from public.library_loans where school_id=p_school_id and borrower_kind=v_kind and borrower_id=v_borrower and returned_at is null and due_date<v_today) then raise exception 'Return overdue books before issuing another'; end if;
    select * into v_res from public.library_reservations where school_id=p_school_id and book_id=v_copy.book_id and status='waiting' order by created_at,id limit 1;
    if found and (v_res.borrower_id<>v_borrower or v_res.borrower_kind<>v_kind) then raise exception 'This title is reserved for another borrower at the front of the queue'; end if;
    v_due := (p_data->>'due_date')::date;
    if v_due is null or v_due<=v_today or v_due>v_today+v_settings.loan_days then raise exception 'Due date must be within the configured loan period'; end if;
    insert into public.library_loans(school_id,copy_id,borrower_kind,borrower_id,borrower_name,due_date,fine_per_day)
      values(p_school_id,v_copy.id,v_kind,v_borrower,v_name,v_due,v_settings.fine_per_day);
    update public.library_copies set status='on_loan' where id=v_copy.id;
    update public.library_reservations set status='fulfilled' where school_id=p_school_id and id=v_res.id;
  elsif p_action='reserve' then
    v_book := (p_data->>'book_id')::uuid;
    if not exists(select 1 from public.library_books where school_id=p_school_id and id=v_book and not archived) then raise exception 'Select an active title'; end if;
    insert into public.library_reservations(school_id,book_id,borrower_kind,borrower_id,borrower_name) values(p_school_id,v_book,v_kind,v_borrower,v_name);
  elsif p_action='cancel_reservation' then
    update public.library_reservations set status='cancelled' where school_id=p_school_id and id=v_id and status='waiting';
    if not found then raise exception 'Reservation is no longer waiting'; end if;
  elsif p_action in ('renew','return','payment','waive') then
    select * into v_loan from public.library_loans where school_id=p_school_id and id=v_id for update;
    if not found then raise exception 'Loan not found'; end if;
    select * into strict v_copy from public.library_copies where school_id=p_school_id and id=v_loan.copy_id;
    if p_action='renew' then
      if v_loan.returned_at is not null or v_loan.due_date<v_today or v_loan.renewals>=v_settings.max_renewals then raise exception 'Loan cannot be renewed: returned, overdue, or renewal limit reached'; end if;
      if exists(select 1 from public.library_reservations where school_id=p_school_id and book_id=v_copy.book_id and status='waiting') then raise exception 'This title has a reservation; return it for the next borrower'; end if;
      update public.library_loans set due_date=due_date+v_settings.loan_days,renewals=renewals+1 where id=v_id;
    elsif p_action='return' then
      if v_loan.returned_at is not null then raise exception 'This loan has already been closed'; end if;
      v_status := p_data->>'outcome';
      if v_status not in ('returned','damaged','lost') or v_status is null then raise exception 'Select a return condition'; end if;
      v_amount := greatest(0,v_today-v_loan.due_date)*v_loan.fine_per_day + case when v_status='lost' then v_copy.replacement_cost else 0 end;
      update public.library_loans set returned_at=now(),outcome=v_status,fine_amount=v_amount where id=v_id;
      update public.library_copies set status=case when v_status='returned' then 'available' else v_status end where id=v_copy.id;
    else
      v_amount := (p_data->>'amount')::numeric;
      if v_loan.returned_at is null or v_amount is null or v_amount<=0 or v_amount>v_loan.fine_amount-v_loan.paid_amount-v_loan.waived_amount then raise exception 'Amount must be positive and within the closed loan balance'; end if;
      if p_action='waive' then
        if not app.has_school_role_key(p_school_id,array['principal','administrator']) then raise exception 'Only the principal or administrator can waive fines'; end if;
        if length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'A waiver reason is required'; end if;
        update public.library_loans set waived_amount=waived_amount+v_amount where id=v_id;
      else
        update public.library_loans set paid_amount=paid_amount+v_amount where id=v_id;
      end if;
    end if;
  elsif p_action='settings' then
    if not app.has_school_role_key(p_school_id,array['principal','administrator']) then raise exception 'Only the principal or administrator can change borrowing rules'; end if;
    update public.library_settings set loan_days=(p_data->>'loan_days')::integer,max_loans=(p_data->>'max_loans')::integer,
      max_renewals=(p_data->>'max_renewals')::integer,fine_per_day=(p_data->>'fine_per_day')::numeric where school_id=p_school_id;
  else raise exception 'Unknown library action';
  end if;
  insert into public.library_events(school_id,actor_id,action,details) values(p_school_id,auth.uid(),p_action,p_data);
end; $$;
revoke all on function public.library_mutate(uuid,text,jsonb), public.library_borrowers(uuid), public.library_allowed(uuid,text) from public,anon;
grant execute on function public.library_mutate(uuid,text,jsonb), public.library_borrowers(uuid), public.library_allowed(uuid,text) to authenticated;
