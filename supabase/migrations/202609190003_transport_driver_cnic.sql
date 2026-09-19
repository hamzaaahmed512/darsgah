alter table public.transport_drivers add column if not exists cnic text;
alter table public.transport_drivers add constraint transport_drivers_cnic_format
  check (cnic is null or cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]$');

-- Historical drivers can be updated later; every new record needs identification.
create or replace function public.require_transport_driver_cnic() returns trigger
language plpgsql as $$
begin
  if new.cnic is null or new.cnic !~ '^[0-9]{5}-[0-9]{7}-[0-9]$' then
    raise exception 'Driver CNIC must be exactly 13 digits.';
  end if;
  return new;
end; $$;
create trigger transport_driver_cnic_on_create before insert on public.transport_drivers
for each row execute function public.require_transport_driver_cnic();
