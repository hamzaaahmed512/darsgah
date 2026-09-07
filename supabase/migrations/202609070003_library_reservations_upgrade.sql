-- ============================================================
-- Upgrade Library Reservations workflow
-- Additive, safe, non-destructive migration.
-- ============================================================

-- ── 1. RPC to get enriched waiting reservations with queue metrics ────
create or replace function public.library_reservations_detailed(
  p_school_id uuid
) returns table(
  id                   uuid,
  book_id              uuid,
  book_title           text,
  author               text,
  borrower_kind        text,
  borrower_id          uuid,
  borrower_name        text,
  status               text,
  created_at           timestamptz,
  grade_name           text,
  section_name         text,
  registration_number text,
  department           text,
  job_title            text,
  email                text,
  total_copies         int,
  available_copies     int,
  queue_position       int,
  is_front_of_queue    boolean,
  is_ready_to_issue    boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.library_allowed(p_school_id, 'library:view') then
    raise exception 'Library access denied';
  end if;

  return query
  with active_reservations as (
    select
      r.id,
      r.book_id,
      r.borrower_kind,
      r.borrower_id,
      r.borrower_name,
      r.status,
      r.created_at,
      row_number() over (partition by r.book_id order by r.created_at, r.id)::int as pos
    from public.library_reservations r
    join public.library_books b on b.id = r.book_id and b.school_id = p_school_id
    where r.school_id = p_school_id and r.status = 'waiting' and not b.archived
  ),
  copy_counts as (
    select
      c.book_id,
      count(case when c.status not in ('lost', 'withdrawn') then 1 end)::int as total_c,
      count(case when c.status = 'available' then 1 end)::int as avail_c
    from public.library_copies c
    where c.school_id = p_school_id
    group by c.book_id
  )
  select
    ar.id,
    ar.book_id,
    b.title as book_title,
    b.author,
    ar.borrower_kind,
    ar.borrower_id,
    ar.borrower_name,
    ar.status,
    ar.created_at,
    st_info.grade_name,
    st_info.section_name,
    st_info.registration_number,
    sf_info.department,
    sf_info.job_title,
    sf_info.email,
    coalesce(cc.total_c, 0)::int as total_copies,
    coalesce(cc.avail_c, 0)::int as available_copies,
    ar.pos as queue_position,
    (ar.pos = 1) as is_front_of_queue,
    (ar.pos = 1 and coalesce(cc.avail_c, 0) > 0 and not b.archived) as is_ready_to_issue
  from active_reservations ar
  join public.library_books b on b.id = ar.book_id and b.school_id = p_school_id
  left join copy_counts cc on cc.book_id = ar.book_id
  left join lateral (
    select
      g.name as grade_name,
      sec.name as section_name,
      st.admission_number::text as registration_number
    from public.students st
    left join public.enrollments e on e.student_id = st.id and e.school_id = p_school_id and e.status = 'active'
    left join public.classes c on c.id = e.class_id and c.school_id = p_school_id
    left join public.grades g on g.id = c.grade_id
    left join public.sections sec on sec.id = c.section_id
    where st.id = ar.borrower_id and ar.borrower_kind = 'student'
    limit 1
  ) st_info on ar.borrower_kind = 'student'
  left join lateral (
    select
      sm.department,
      coalesce(sm.job_title, sm.role::text) as job_title,
      p.email
    from public.school_members sm
    join public.profiles p on p.id = sm.user_id
    where sm.user_id = ar.borrower_id and sm.school_id = p_school_id
    limit 1
  ) sf_info on ar.borrower_kind = 'staff'
  order by b.title, ar.pos, ar.created_at;
end; $$;

-- ── 2. Update library_mutate for reservation reservation_id support & duplicate checks ────
create or replace function public.library_mutate(
  p_school_id uuid,
  p_action    text,
  p_data      jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_today       date := (now() at time zone 'Asia/Karachi')::date;
  v_settings    public.library_settings%rowtype;
  v_copy        public.library_copies%rowtype;
  v_loan        public.library_loans%rowtype;
  v_res         public.library_reservations%rowtype;
  v_id          uuid;
  v_book        uuid;
  v_borrower    uuid;
  v_name        text;
  v_kind        text;
  v_due         date;
  v_status      text;
  v_amount      numeric;
  v_max_loans   int;
  v_loan_days   int;
  v_max_renew   int;
  v_renew_days  int;
  v_qty         int;
  v_counter     bigint;
  v_accession   text;
  v_cost        numeric;
  v_i           int;
  v_new_due     date;
  v_note        text;
  v_res_id      uuid;
begin
  if not public.library_allowed(p_school_id, 'library:manage') then
    raise exception 'Library management access denied';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text, 607));
  select * into strict v_settings from public.library_settings where school_id = p_school_id;
  v_id := nullif(p_data->>'id', '')::uuid;

  if p_action in ('issue', 'reserve') then
    v_kind     := p_data->>'borrower_kind';
    v_borrower := (p_data->>'borrower_id')::uuid;
    if v_kind = 'student' then
      select concat_ws(' ', first_name, last_name) into v_name from public.students where id = v_borrower and school_id = p_school_id and status = 'active';
    elsif v_kind = 'staff' then
      select p.full_name into v_name from public.school_members sm join public.profiles p on p.id = sm.user_id where sm.user_id = v_borrower and sm.school_id = p_school_id and sm.status = 'active';
    end if;
    if v_name is null then raise exception 'Select an active borrower from this school'; end if;
  end if;

  if p_action in ('book', 'edit_book') then
    if p_action = 'book' then
      insert into public.library_books(school_id, title, author, isbn, category, publisher, shelf, default_replacement_cost)
      values(
        p_school_id,
        trim(p_data->>'title'),
        trim(coalesce(p_data->>'author', '')),
        trim(coalesce(p_data->>'isbn', '')),
        trim(coalesce(p_data->>'category', '')),
        trim(coalesce(p_data->>'publisher', '')),
        trim(coalesce(p_data->>'shelf', '')),
        nullif(trim(coalesce(p_data->>'default_replacement_cost', '')), '')::numeric
      );
    else
      update public.library_books
        set title = trim(p_data->>'title'),
            author = trim(coalesce(p_data->>'author', '')),
            isbn = trim(coalesce(p_data->>'isbn', '')),
            category = trim(coalesce(p_data->>'category', '')),
            publisher = trim(coalesce(p_data->>'publisher', '')),
            shelf = trim(coalesce(p_data->>'shelf', '')),
            default_replacement_cost = nullif(trim(coalesce(p_data->>'default_replacement_cost', '')), '')::numeric
        where school_id = p_school_id and id = v_id;
      if not found then raise exception 'Book not found'; end if;
    end if;

  elsif p_action = 'copy' then
    v_book := (p_data->>'book_id')::uuid;
    if not exists(select 1 from public.library_books where school_id = p_school_id and id = v_book and not archived) then
      raise exception 'Select an active title';
    end if;
    insert into public.library_copies(school_id, book_id, accession, replacement_cost)
      values(p_school_id, v_book, upper(trim(p_data->>'accession')), nullif(trim(coalesce(p_data->>'replacement_cost', '')), '')::numeric);

  elsif p_action in ('add_copies', 'add_book_with_copies') then
    if p_action = 'add_book_with_copies' then
      insert into public.library_books(school_id, title, author, isbn, category, publisher, shelf, default_replacement_cost)
      values(
        p_school_id,
        trim(p_data->>'title'),
        trim(coalesce(p_data->>'author', '')),
        trim(coalesce(p_data->>'isbn', '')),
        trim(coalesce(p_data->>'category', '')),
        trim(coalesce(p_data->>'publisher', '')),
        trim(coalesce(p_data->>'shelf', '')),
        nullif(trim(coalesce(p_data->>'default_replacement_cost', '')), '')::numeric
      ) returning id into v_book;
    else
      v_book := (p_data->>'book_id')::uuid;
      if not exists(select 1 from public.library_books where school_id = p_school_id and id = v_book and not archived) then
        raise exception 'Select an active title';
      end if;
    end if;

    v_qty := (p_data->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'Quantity must be between 1 and 50';
    end if;

    v_cost := nullif(trim(coalesce(p_data->>'replacement_cost', '')), '')::numeric;
    if v_cost is null then
      select default_replacement_cost into v_cost from public.library_books where school_id = p_school_id and id = v_book;
    end if;

    insert into public.library_copy_counter(school_id, next_val) values(p_school_id, 1) on conflict(school_id) do nothing;
    update public.library_copy_counter set next_val = next_val + v_qty where school_id = p_school_id returning next_val - v_qty into v_counter;

    for v_i in 0 .. v_qty - 1 loop
      v_accession := 'LIB-' || lpad((v_counter + v_i)::text, 4, '0');
      if v_counter + v_i > 9999 then
        v_accession := 'LIB-' || (v_counter + v_i)::text;
      end if;
      insert into public.library_copies(school_id, book_id, accession, replacement_cost)
        values(p_school_id, v_book, v_accession, v_cost);
    end loop;

  elsif p_action = 'archive' then
    if exists(select 1 from public.library_copies where school_id = p_school_id and book_id = v_id and status = 'on_loan')
      or exists(select 1 from public.library_reservations where school_id = p_school_id and book_id = v_id and status = 'waiting')
    then
      raise exception 'Resolve open loans and reservations before archiving';
    end if;
    update public.library_books set archived = (p_data->>'archived')::boolean where school_id = p_school_id and id = v_id;
    if not found then raise exception 'Book not found'; end if;

  elsif p_action = 'copy_status' then
    v_status := p_data->>'status';
    if v_status not in ('available', 'damaged', 'lost', 'withdrawn') or v_status is null then
      raise exception 'Invalid copy status';
    end if;
    update public.library_copies set status = v_status where school_id = p_school_id and id = v_id and status <> 'on_loan';
    if not found then raise exception 'Copy unavailable; close its loan first'; end if;

  elsif p_action = 'issue' then
    select * into v_copy from public.library_copies where school_id = p_school_id and id = (p_data->>'copy_id')::uuid for update;
    if not found or v_copy.status <> 'available' then
      raise exception 'This copy is no longer available';
    end if;
    if exists(select 1 from public.library_books where school_id = p_school_id and id = v_copy.book_id and archived) then
      raise exception 'This title is archived';
    end if;

    if v_kind = 'student' then
      v_max_loans := v_settings.student_max_loans;
      v_loan_days := v_settings.student_loan_days;
    else
      v_max_loans := v_settings.staff_max_loans;
      v_loan_days := v_settings.staff_loan_days;
    end if;

    if (select count(*) from public.library_loans where school_id = p_school_id and borrower_kind = v_kind and borrower_id = v_borrower and returned_at is null) >= v_max_loans then
      raise exception 'Borrower has reached the loan limit (% active loans)', v_max_loans;
    end if;
    if exists(select 1 from public.library_loans where school_id = p_school_id and borrower_kind = v_kind and borrower_id = v_borrower and returned_at is null and due_date < v_today) then
      raise exception 'Borrower has overdue books that must be returned first';
    end if;

    v_res_id := nullif(p_data->>'reservation_id', '')::uuid;
    if v_res_id is not null then
      select * into v_res from public.library_reservations where school_id = p_school_id and id = v_res_id and status = 'waiting' for update;
      if not found then
        raise exception 'This reservation is no longer active or waiting';
      end if;
      if v_res.book_id <> v_copy.book_id then
        raise exception 'The selected copy does not match the reserved book title';
      end if;
      if v_res.borrower_id <> v_borrower or v_res.borrower_kind <> v_kind then
        raise exception 'The selected borrower does not match the reservation holder';
      end if;
    else
      select * into v_res from public.library_reservations where school_id = p_school_id and book_id = v_copy.book_id and status = 'waiting' order by created_at, id limit 1;
      if found and (v_res.borrower_id <> v_borrower or v_res.borrower_kind <> v_kind) then
        raise exception 'This title is reserved for another borrower at the front of the queue';
      end if;
    end if;

    v_due := nullif(p_data->>'due_date', '')::date;
    if v_due is null then
      v_due := v_today + v_loan_days;
    end if;

    if v_due <= v_today or v_due > v_today + 90 then
      raise exception 'Due date must be in the future within 90 days';
    end if;

    insert into public.library_loans(school_id, copy_id, borrower_kind, borrower_id, borrower_name, due_date, fine_per_day)
      values(p_school_id, v_copy.id, v_kind, v_borrower, v_name, v_due, v_settings.fine_per_day);
    update public.library_copies set status = 'on_loan' where id = v_copy.id;

    if v_res.id is not null then
      update public.library_reservations set status = 'fulfilled' where school_id = p_school_id and id = v_res.id;
    end if;

  elsif p_action = 'reserve' then
    v_book := (p_data->>'book_id')::uuid;
    if not exists(select 1 from public.library_books where school_id = p_school_id and id = v_book and not archived) then
      raise exception 'Select an active title';
    end if;
    if exists(select 1 from public.library_reservations where school_id = p_school_id and book_id = v_book and borrower_kind = v_kind and borrower_id = v_borrower and status = 'waiting') then
      raise exception 'This borrower already has an active waiting reservation for this book title';
    end if;

    insert into public.library_reservations(school_id, book_id, borrower_kind, borrower_id, borrower_name)
      values(p_school_id, v_book, v_kind, v_borrower, v_name);

  elsif p_action = 'cancel_reservation' then
    update public.library_reservations set status = 'cancelled' where school_id = p_school_id and id = v_id and status = 'waiting';
    if not found then raise exception 'Reservation is no longer waiting'; end if;

  elsif p_action in ('renew', 'return', 'payment', 'waive') then
    select * into v_loan from public.library_loans where school_id = p_school_id and id = v_id for update;
    if not found then raise exception 'Loan not found'; end if;
    select * into strict v_copy from public.library_copies where school_id = p_school_id and id = v_loan.copy_id;

    if p_action = 'renew' then
      if v_loan.returned_at is not null then
        raise exception 'Returned loans cannot be renewed';
      end if;

      if v_loan.borrower_kind = 'student' then
        v_max_renew  := v_settings.student_max_renewals;
        v_renew_days := v_settings.student_renewal_days;
      else
        v_max_renew  := v_settings.staff_max_renewals;
        v_renew_days := v_settings.staff_renewal_days;
      end if;

      if v_loan.renewals >= v_max_renew then
        raise exception 'Maximum renewal limit reached (% of % renewals used)', v_loan.renewals, v_max_renew;
      end if;

      if exists(select 1 from public.library_reservations where school_id = p_school_id and book_id = v_copy.book_id and status = 'waiting') then
        raise exception 'This title has a waiting reservation; please return it for the next borrower';
      end if;

      if v_loan.due_date < v_today then
        v_new_due := v_today + v_renew_days;
      else
        v_new_due := v_loan.due_date + v_renew_days;
      end if;

      update public.library_loans
        set due_date = v_new_due,
            renewals = renewals + 1
        where id = v_id;

    elsif p_action = 'return' then
      if v_loan.returned_at is not null then raise exception 'This loan has already been closed'; end if;
      v_status := p_data->>'outcome';
      if v_status not in ('returned', 'damaged', 'lost') or v_status is null then
        raise exception 'Select a return condition';
      end if;
      v_amount := greatest(0, v_today - v_loan.due_date) * v_loan.fine_per_day + case when v_status = 'lost' then coalesce(v_copy.replacement_cost, 0) else 0 end;
      v_note   := trim(coalesce(p_data->>'note', ''));

      update public.library_loans set returned_at = now(), outcome = v_status, fine_amount = v_amount where id = v_id;
      update public.library_copies set status = case when v_status = 'returned' then 'available' else v_status end where id = v_copy.id;

    else
      v_amount := (p_data->>'amount')::numeric;
      if v_loan.returned_at is null or v_amount is null or v_amount <= 0 or v_amount > v_loan.fine_amount - v_loan.paid_amount - v_loan.waived_amount then
        raise exception 'Amount must be positive and within the closed loan balance';
      end if;
      if p_action = 'waive' then
        if not app.has_school_role_key(p_school_id, array['principal', 'administrator']) then
          raise exception 'Only the principal or administrator can waive fines';
        end if;
        if length(trim(coalesce(p_data->>'reason', ''))) < 3 then
          raise exception 'A waiver reason is required';
        end if;
        update public.library_loans set waived_amount = waived_amount + v_amount where id = v_id;
      else
        update public.library_loans set paid_amount = paid_amount + v_amount where id = v_id;
      end if;
    end if;

  elsif p_action = 'settings' then
    if not app.has_school_role_key(p_school_id, array['principal', 'administrator']) then
      raise exception 'Only the principal or administrator can change borrowing rules';
    end if;

    update public.library_settings
      set student_loan_days    = coalesce((p_data->>'student_loan_days')::integer, loan_days),
          student_max_loans    = coalesce((p_data->>'student_max_loans')::integer, max_loans),
          student_max_renewals = coalesce((p_data->>'student_max_renewals')::integer, max_renewals),
          student_renewal_days = coalesce((p_data->>'student_renewal_days')::integer, loan_days),
          staff_loan_days      = coalesce((p_data->>'staff_loan_days')::integer, 30),
          staff_max_loans      = coalesce((p_data->>'staff_max_loans')::integer, 5),
          staff_max_renewals   = coalesce((p_data->>'staff_max_renewals')::integer, 3),
          staff_renewal_days   = coalesce((p_data->>'staff_renewal_days')::integer, 30),
          fine_per_day         = (p_data->>'fine_per_day')::numeric,
          loan_days            = coalesce((p_data->>'student_loan_days')::integer, loan_days),
          max_loans            = coalesce((p_data->>'student_max_loans')::integer, max_loans),
          max_renewals         = coalesce((p_data->>'student_max_renewals')::integer, max_renewals)
      where school_id = p_school_id;

  else
    raise exception 'Unknown library action';
  end if;

  insert into public.library_events(school_id, actor_id, action, details)
    values(p_school_id, auth.uid(), p_action, p_data);
end; $$;

revoke all on function public.library_reservations_detailed(uuid) from public, anon;
grant execute on function public.library_reservations_detailed(uuid) to authenticated;
