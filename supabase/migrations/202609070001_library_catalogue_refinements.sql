-- ============================================================
-- Library catalogue refinements
-- Safe, additive, non-destructive. Existing records preserved.
-- ============================================================

-- ── 1. School-scoped Copy ID counter ────────────────────────
-- Stores the next sequence number per school.  The advisory lock
-- that already serialises all library_mutate calls makes the
-- increment fully safe under concurrent requests.
create table if not exists public.library_copy_counter (
  school_id uuid primary key references public.schools(id) on delete cascade,
  next_val  bigint not null default 1 check (next_val >= 1)
);

-- Seed a counter row for every school that already exists.
insert into public.library_copy_counter(school_id)
  select id from public.schools
  on conflict do nothing;

-- ── 2. Book-level default replacement cost ──────────────────
-- Used to pre-fill the "Add copies" form.  NULL = not specified.
alter table public.library_books
  add column if not exists default_replacement_cost numeric(10,2)
    check (default_replacement_cost is null or default_replacement_cost between 0 and 1000000);

-- ── 3. Relax library_copies.replacement_cost to nullable ────
-- NULL means "unknown / not specified".  Existing 0 rows kept as-is.
alter table public.library_copies
  alter column replacement_cost drop not null,
  alter column replacement_cost drop default;

-- Rebuild the check constraint to allow NULL.
alter table public.library_copies
  drop constraint if exists library_copies_replacement_cost_check;
alter table public.library_copies
  add  constraint library_copies_replacement_cost_check
    check (replacement_cost is null or replacement_cost between 0 and 1000000);

-- ── 4. Relax library_books.author (empty string allowed) ────
alter table public.library_books
  drop constraint if exists library_books_author_check;
alter table public.library_books
  add  constraint library_books_author_check
    check (length(trim(author)) <= 200);

-- ── 5. Seed counter for new schools via the existing trigger ─
-- library_seed_school already runs after insert on schools.
-- We just add the counter row there.
create or replace function public.library_seed_school()
  returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.library_settings(school_id) values(new.id) on conflict do nothing;
  insert into public.library_copy_counter(school_id) values(new.id) on conflict do nothing;
  insert into public.role_permissions(school_id,role_key,permission,granted)
    select new.id,r,p,true from unnest(array['principal','administrator','librarian']) r
    cross join unnest(array['library:view','library:manage']) p on conflict do nothing;
  insert into public.role_permissions(school_id,role_key,permission,granted)
    select new.id,'librarian',p,true
    from unnest(array['dashboard:view','leave:view','announcements:view']) p
    on conflict do nothing;
  return new;
end; $$;

-- ── 6. RLS for new table ─────────────────────────────────────
alter table public.library_copy_counter enable row level security;
create policy library_counter_read on public.library_copy_counter
  for select to authenticated
  using (public.library_allowed(school_id,'library:view'));
revoke all on public.library_copy_counter from anon, authenticated;
grant select on public.library_copy_counter to authenticated;

-- ── 7. Extend library_mutate with new actions ────────────────
-- We replace the entire function body so the add_copies and
-- add_book_with_copies branches fit naturally alongside the
-- existing ones.  All original logic is preserved verbatim.
create or replace function public.library_mutate(
  p_school_id uuid,
  p_action    text,
  p_data      jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_today     date := (now() at time zone 'Asia/Karachi')::date;
  v_settings  public.library_settings%rowtype;
  v_copy      public.library_copies%rowtype;
  v_loan      public.library_loans%rowtype;
  v_res       public.library_reservations%rowtype;
  v_id        uuid;
  v_book      uuid;
  v_borrower  uuid;
  v_name      text;
  v_kind      text;
  v_due       date;
  v_status    text;
  v_amount    numeric;
  -- copy-generation helpers
  v_qty       int;
  v_counter   bigint;
  v_accession text;
  v_cost      numeric;
  v_i         int;
begin
  if not public.library_allowed(p_school_id,'library:manage') then
    raise exception 'Library management access denied';
  end if;
  -- A school-level transaction lock serialises circulation, stock and policy changes.
  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text, 607));
  select * into strict v_settings from public.library_settings where school_id=p_school_id;
  v_id := nullif(p_data->>'id','')::uuid;

  if p_action in ('issue','reserve') then
    v_kind     := p_data->>'borrower_kind';
    v_borrower := (p_data->>'borrower_id')::uuid;
    select b.name into v_name
      from public.library_borrowers(p_school_id) b
      where b.id=v_borrower and b.kind=v_kind;
    if v_name is null then raise exception 'Select an active borrower from this school'; end if;
  end if;

  -- ── Book / edit_book ──────────────────────────────────────
  if p_action in ('book','edit_book') then
    if p_action='book' then
      insert into public.library_books(school_id,title,author,isbn,category,publisher,shelf,default_replacement_cost)
      values(
        p_school_id,
        trim(p_data->>'title'),
        trim(coalesce(p_data->>'author','')),
        trim(coalesce(p_data->>'isbn','')),
        trim(coalesce(p_data->>'category','')),
        trim(coalesce(p_data->>'publisher','')),
        trim(coalesce(p_data->>'shelf','')),
        nullif(trim(coalesce(p_data->>'default_replacement_cost','')),'' )::numeric
      );
    else
      update public.library_books
        set title=trim(p_data->>'title'),
            author=trim(coalesce(p_data->>'author','')),
            isbn=trim(coalesce(p_data->>'isbn','')),
            category=trim(coalesce(p_data->>'category','')),
            publisher=trim(coalesce(p_data->>'publisher','')),
            shelf=trim(coalesce(p_data->>'shelf','')),
            default_replacement_cost=nullif(trim(coalesce(p_data->>'default_replacement_cost','')),'' )::numeric
        where school_id=p_school_id and id=v_id;
      if not found then raise exception 'Book not found'; end if;
    end if;

  -- ── Legacy single-copy registration (preserves old accession numbers) ──
  elsif p_action='copy' then
    v_book := (p_data->>'book_id')::uuid;
    if not exists(select 1 from public.library_books where school_id=p_school_id and id=v_book and not archived) then
      raise exception 'Select an active title';
    end if;
    insert into public.library_copies(school_id,book_id,accession,replacement_cost)
      values(p_school_id,v_book,upper(trim(p_data->>'accession')),
             nullif(trim(coalesce(p_data->>'replacement_cost','')),'' )::numeric);

  -- ── Add copies (auto-generated Copy IDs) ─────────────────
  elsif p_action in ('add_copies','add_book_with_copies') then
    if p_action='add_book_with_copies' then
      -- Insert the book first, capture its ID.
      insert into public.library_books(school_id,title,author,isbn,category,publisher,shelf,default_replacement_cost)
      values(
        p_school_id,
        trim(p_data->>'title'),
        trim(coalesce(p_data->>'author','')),
        trim(coalesce(p_data->>'isbn','')),
        trim(coalesce(p_data->>'category','')),
        trim(coalesce(p_data->>'publisher','')),
        trim(coalesce(p_data->>'shelf','')),
        nullif(trim(coalesce(p_data->>'default_replacement_cost','')),'' )::numeric
      ) returning id into v_book;
    else
      -- add_copies to an existing book.
      v_book := (p_data->>'book_id')::uuid;
      if not exists(select 1 from public.library_books where school_id=p_school_id and id=v_book and not archived) then
        raise exception 'Select an active title';
      end if;
    end if;

    v_qty := (p_data->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'Quantity must be between 1 and 50';
    end if;

    -- Determine replacement cost for new copies.
    -- Use explicit value if given; fall back to book default; otherwise null.
    v_cost := nullif(trim(coalesce(p_data->>'replacement_cost','')),'' )::numeric;
    if v_cost is null then
      select default_replacement_cost into v_cost
        from public.library_books where school_id=p_school_id and id=v_book;
    end if;

    -- Atomically claim v_qty counter slots.
    insert into public.library_copy_counter(school_id, next_val)
      values(p_school_id, 1)
      on conflict(school_id) do nothing;
    update public.library_copy_counter
      set next_val = next_val + v_qty
      where school_id = p_school_id
      returning next_val - v_qty into v_counter;

    -- Insert one copy per slot.
    for v_i in 0 .. v_qty - 1 loop
      v_accession := 'LIB-' || lpad((v_counter + v_i)::text, 4, '0');
      -- Handle counter values > 9999 gracefully (no zero-padding overflow).
      if v_counter + v_i > 9999 then
        v_accession := 'LIB-' || (v_counter + v_i)::text;
      end if;
      insert into public.library_copies(school_id,book_id,accession,replacement_cost)
        values(p_school_id, v_book, v_accession, v_cost);
    end loop;

  -- ── Archive / restore ────────────────────────────────────
  elsif p_action='archive' then
    if exists(select 1 from public.library_copies where school_id=p_school_id and book_id=v_id and status='on_loan')
      or exists(select 1 from public.library_reservations where school_id=p_school_id and book_id=v_id and status='waiting')
    then
      raise exception 'Resolve open loans and reservations before archiving';
    end if;
    update public.library_books set archived=(p_data->>'archived')::boolean
      where school_id=p_school_id and id=v_id;
    if not found then raise exception 'Book not found'; end if;

  -- ── Copy status ──────────────────────────────────────────
  elsif p_action='copy_status' then
    v_status := p_data->>'status';
    if v_status not in ('available','damaged','lost','withdrawn') or v_status is null then
      raise exception 'Invalid copy status';
    end if;
    update public.library_copies set status=v_status
      where school_id=p_school_id and id=v_id and status<>'on_loan';
    if not found then raise exception 'Copy unavailable; close its loan first'; end if;

  -- ── Issue ────────────────────────────────────────────────
  elsif p_action='issue' then
    select * into v_copy from public.library_copies
      where school_id=p_school_id and id=(p_data->>'copy_id')::uuid for update;
    if not found or v_copy.status<>'available' then
      raise exception 'This copy is no longer available';
    end if;
    if exists(select 1 from public.library_books where school_id=p_school_id and id=v_copy.book_id and archived) then
      raise exception 'This title is archived';
    end if;
    if (select count(*) from public.library_loans
        where school_id=p_school_id and borrower_kind=v_kind and borrower_id=v_borrower and returned_at is null)
        >= v_settings.max_loans then
      raise exception 'Borrower has reached the loan limit';
    end if;
    if exists(select 1 from public.library_loans
        where school_id=p_school_id and borrower_kind=v_kind and borrower_id=v_borrower
          and returned_at is null and due_date<v_today) then
      raise exception 'Return overdue books before issuing another';
    end if;
    select * into v_res from public.library_reservations
      where school_id=p_school_id and book_id=v_copy.book_id and status='waiting'
      order by created_at,id limit 1;
    if found and (v_res.borrower_id<>v_borrower or v_res.borrower_kind<>v_kind) then
      raise exception 'This title is reserved for another borrower at the front of the queue';
    end if;
    v_due := (p_data->>'due_date')::date;
    if v_due is null or v_due<=v_today or v_due>v_today+v_settings.loan_days then
      raise exception 'Due date must be within the configured loan period';
    end if;
    insert into public.library_loans(school_id,copy_id,borrower_kind,borrower_id,borrower_name,due_date,fine_per_day)
      values(p_school_id,v_copy.id,v_kind,v_borrower,v_name,v_due,v_settings.fine_per_day);
    update public.library_copies set status='on_loan' where id=v_copy.id;
    update public.library_reservations set status='fulfilled'
      where school_id=p_school_id and id=v_res.id;

  -- ── Reserve ──────────────────────────────────────────────
  elsif p_action='reserve' then
    v_book := (p_data->>'book_id')::uuid;
    if not exists(select 1 from public.library_books where school_id=p_school_id and id=v_book and not archived) then
      raise exception 'Select an active title';
    end if;
    insert into public.library_reservations(school_id,book_id,borrower_kind,borrower_id,borrower_name)
      values(p_school_id,v_book,v_kind,v_borrower,v_name);

  -- ── Cancel reservation ───────────────────────────────────
  elsif p_action='cancel_reservation' then
    update public.library_reservations set status='cancelled'
      where school_id=p_school_id and id=v_id and status='waiting';
    if not found then raise exception 'Reservation is no longer waiting'; end if;

  -- ── Renew / return / payment / waive ────────────────────
  elsif p_action in ('renew','return','payment','waive') then
    select * into v_loan from public.library_loans
      where school_id=p_school_id and id=v_id for update;
    if not found then raise exception 'Loan not found'; end if;
    select * into strict v_copy from public.library_copies
      where school_id=p_school_id and id=v_loan.copy_id;

    if p_action='renew' then
      if v_loan.returned_at is not null or v_loan.due_date<v_today or v_loan.renewals>=v_settings.max_renewals then
        raise exception 'Loan cannot be renewed: returned, overdue, or renewal limit reached';
      end if;
      if exists(select 1 from public.library_reservations
          where school_id=p_school_id and book_id=v_copy.book_id and status='waiting') then
        raise exception 'This title has a reservation; return it for the next borrower';
      end if;
      update public.library_loans set due_date=due_date+v_settings.loan_days,renewals=renewals+1 where id=v_id;

    elsif p_action='return' then
      if v_loan.returned_at is not null then raise exception 'This loan has already been closed'; end if;
      v_status := p_data->>'outcome';
      if v_status not in ('returned','damaged','lost') or v_status is null then
        raise exception 'Select a return condition';
      end if;
      v_amount := greatest(0,v_today-v_loan.due_date)*v_loan.fine_per_day +
                  case when v_status='lost' then coalesce(v_copy.replacement_cost, 0) else 0 end;
      update public.library_loans set returned_at=now(),outcome=v_status,fine_amount=v_amount where id=v_id;
      update public.library_copies set status=case when v_status='returned' then 'available' else v_status end
        where id=v_copy.id;

    else
      v_amount := (p_data->>'amount')::numeric;
      if v_loan.returned_at is null or v_amount is null or v_amount<=0
        or v_amount>v_loan.fine_amount-v_loan.paid_amount-v_loan.waived_amount then
        raise exception 'Amount must be positive and within the closed loan balance';
      end if;
      if p_action='waive' then
        if not app.has_school_role_key(p_school_id,array['principal','administrator']) then
          raise exception 'Only the principal or administrator can waive fines';
        end if;
        if length(trim(coalesce(p_data->>'reason','')))<3 then
          raise exception 'A waiver reason is required';
        end if;
        update public.library_loans set waived_amount=waived_amount+v_amount where id=v_id;
      else
        update public.library_loans set paid_amount=paid_amount+v_amount where id=v_id;
      end if;
    end if;

  -- ── Borrowing settings ───────────────────────────────────
  elsif p_action='settings' then
    if not app.has_school_role_key(p_school_id,array['principal','administrator']) then
      raise exception 'Only the principal or administrator can change borrowing rules';
    end if;
    update public.library_settings
      set loan_days=(p_data->>'loan_days')::integer,
          max_loans=(p_data->>'max_loans')::integer,
          max_renewals=(p_data->>'max_renewals')::integer,
          fine_per_day=(p_data->>'fine_per_day')::numeric
      where school_id=p_school_id;

  else
    raise exception 'Unknown library action';
  end if;

  insert into public.library_events(school_id,actor_id,action,details)
    values(p_school_id,auth.uid(),p_action,p_data);
end; $$;
