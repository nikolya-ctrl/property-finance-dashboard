-- Hiltonia dashboard: initial schema
-- Roles: owner (everything) and staff (operations, no money/ID/reports/settings).
-- Security lives here via Row Level Security, not in the UI.

create extension if not exists btree_gist;
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  title       text not null default '',
  role        text not null default 'staff' check (role in ('owner', 'staff')),
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Role lookups used by every policy. Lives in the non-exposed private schema.
create or replace function private.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner' and active
  );
$$;

create or replace function private.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active
  );
$$;

revoke all on function private.is_owner(), private.is_member() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_owner(), private.is_member() to authenticated;

-- New sign-ups get a staff profile; owners promote them in Settings.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Staff can't promote themselves.
create or replace function private.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and not private.is_owner() then
    raise exception 'Only owners can change roles or deactivate users';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function private.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Reference data (editable in Settings)
-- ---------------------------------------------------------------------------
create table public.properties (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  location               text not null default '',
  region                 text not null default '',
  status                 text not null default 'setup' check (status in ('operating', 'setup', 'inactive')),
  max_guests             int  not null default 2 check (max_guests > 0),
  default_checkin_time   time not null default '14:00',
  default_checkout_time  time not null default '11:00',
  base_rate_lkr          numeric(12,2) not null default 0,
  created_at             timestamptz not null default now()
);

create table public.channels (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null unique,
  color                   text not null default '#64748B',
  default_commission_pct  numeric(5,2) not null default 0 check (default_commission_pct between 0 and 100),
  payout_delay_days       int not null default 0,
  active                  boolean not null default true,
  sort_order              int not null default 0
);

create table public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  sort_order  int not null default 0
);

create table public.exchange_rates (
  rate_date  date primary key,
  usd_lkr    numeric(10,4) not null check (usd_lkr > 0)
);

-- ---------------------------------------------------------------------------
-- Guests and bookings
-- ---------------------------------------------------------------------------
create table public.guests (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  phone         text,
  email         text,
  country       text,
  extra_fields  jsonb not null default '{}',
  notes         text,
  created_at    timestamptz not null default now()
);
create index guests_name_idx on public.guests (lower(full_name));

-- Owner-only: passport / NIC.
create table public.guest_identity (
  guest_id       uuid primary key references public.guests (id) on delete cascade,
  id_type        text not null check (id_type in ('passport', 'nic', 'other')),
  id_number      text not null,
  id_photo_path  text
);

create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  ref_no            bigint generated always as identity unique,
  property_id       uuid not null references public.properties (id),
  channel_id        uuid not null references public.channels (id),
  guest_id          uuid not null references public.guests (id),
  external_ref      text,
  source            text not null default 'manual' check (source in ('manual', 'csv', 'ical', 'channel_manager')),
  status            text not null default 'confirmed'
                    check (status in ('enquiry', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  check_in          date not null,
  check_out         date not null,
  nights            int generated always as (check_out - check_in) stored,
  adults            int not null default 1 check (adults >= 0),
  children          int not null default 0 check (children >= 0),
  expected_arrival  time,
  pickup_needed     boolean not null default false,
  special_requests  text,
  created_by        uuid references public.profiles (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint check_out_after_check_in check (check_out > check_in),
  -- Double-booking protection. '[)' = check-out day is free for the next guest.
  constraint no_overlapping_bookings exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('confirmed', 'checked_in'))
);
create index bookings_property_idx on public.bookings (property_id);
create index bookings_channel_idx  on public.bookings (channel_id);
create index bookings_guest_idx    on public.bookings (guest_id);
create index bookings_dates_idx    on public.bookings (check_in, check_out);

-- Owner-only money. Staff may insert once when creating a booking but never read it back.
create table public.booking_finances (
  booking_id         uuid primary key references public.bookings (id) on delete cascade,
  currency           text not null default 'LKR' check (currency in ('LKR', 'USD')),
  gross_amount       numeric(12,2) not null default 0 check (gross_amount >= 0),
  commission_pct     numeric(5,2)  not null default 0 check (commission_pct between 0 and 100),
  commission_amount  numeric(12,2) generated always as (round(gross_amount * commission_pct / 100, 2)) stored,
  fx_rate_usd_lkr    numeric(10,4) not null default 300 check (fx_rate_usd_lkr > 0),
  deposit_due        numeric(12,2) not null default 0,
  payout_expected_on date,
  payout_received_on date,
  payout_amount      numeric(12,2),
  payout_status      text not null default 'n/a' check (payout_status in ('n/a', 'pending', 'received', 'late'))
);

create table public.booking_extras (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  label       text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  currency    text not null default 'LKR' check (currency in ('LKR', 'USD'))
);
create index booking_extras_booking_idx on public.booking_extras (booking_id);

-- Money received directly from the guest (cash, bank transfer). Staff: insert only.
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  paid_on      date not null default current_date,
  amount       numeric(12,2) not null check (amount > 0),
  currency     text not null default 'LKR' check (currency in ('LKR', 'USD')),
  fx_rate_usd_lkr numeric(10,4) not null default 300,
  method       text not null default 'cash' check (method in ('cash', 'bank', 'card', 'other')),
  voided       boolean not null default false,
  created_by   uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id               uuid primary key default gen_random_uuid(),
  spent_on         date not null default current_date,
  property_id      uuid references public.properties (id),  -- null = shared / General
  category_id      uuid not null references public.expense_categories (id),
  amount           numeric(12,2) not null check (amount > 0),
  currency         text not null default 'LKR' check (currency in ('LKR', 'USD')),
  fx_rate_usd_lkr  numeric(10,4) not null default 300,
  note             text not null default '',
  receipt_path     text,
  created_by       uuid references public.profiles (id) default auth.uid(),
  created_at       timestamptz not null default now()
);
create index expenses_date_idx     on public.expenses (spent_on);
create index expenses_property_idx on public.expenses (property_id);
create index expenses_category_idx on public.expenses (category_id);
create index expenses_created_by_idx on public.expenses (created_by);

-- ---------------------------------------------------------------------------
-- Operations
-- ---------------------------------------------------------------------------
create table public.cleaning_tasks (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties (id),
  booking_id    uuid unique references public.bookings (id) on delete set null,
  assigned_to   uuid references public.profiles (id),
  due_on        date not null,
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  note          text not null default '',
  completed_at  timestamptz
);
create index cleaning_due_idx on public.cleaning_tasks (due_on);
create index cleaning_property_idx on public.cleaning_tasks (property_id);
create index cleaning_assigned_idx on public.cleaning_tasks (assigned_to);

-- A cleaning task is created for every booking's check-out day.
create or replace function private.sync_cleaning_task()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('confirmed', 'checked_in', 'completed') then
    insert into public.cleaning_tasks (property_id, booking_id, due_on, note)
    values (new.property_id, new.id, new.check_out, 'Turnover after check-out')
    on conflict (booking_id) do update
      set due_on = excluded.due_on, property_id = excluded.property_id;
  else
    delete from public.cleaning_tasks where booking_id = new.id and status <> 'done';
  end if;
  return new;
end;
$$;

create trigger bookings_cleaning
  after insert or update of status, check_out, property_id on public.bookings
  for each row execute function private.sync_cleaning_task();

create table public.maintenance_issues (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties (id),
  title        text not null,
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'urgent')),
  status       text not null default 'open' check (status in ('open', 'in_progress', 'fixed')),
  reported_on  date not null default current_date,
  fixed_on     date,
  cost_lkr     numeric(12,2),
  expense_id   uuid references public.expenses (id) on delete set null,
  created_by   uuid references public.profiles (id) default auth.uid()
);
create index maintenance_property_idx on public.maintenance_issues (property_id);

create table public.inventory_items (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references public.properties (id),
  name             text not null,
  unit             text not null default 'pcs',
  quantity         numeric(10,2) not null default 0 check (quantity >= 0),
  low_stock_level  numeric(10,2) not null default 0
);
create index inventory_property_idx on public.inventory_items (property_id);

create table public.inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.inventory_items (id) on delete cascade,
  change      numeric(10,2) not null,
  reason      text not null default 'used' check (reason in ('restock', 'used', 'damaged', 'count')),
  created_by  uuid references public.profiles (id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create index inventory_movements_item_idx on public.inventory_movements (item_id);

-- Applying a movement updates stock atomically.
create or replace function private.apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.inventory_items
     set quantity = greatest(0, quantity + new.change)
   where id = new.item_id;
  return new;
end;
$$;

create trigger inventory_movement_apply
  after insert on public.inventory_movements
  for each row execute function private.apply_inventory_movement();

-- ---------------------------------------------------------------------------
-- Audit log (owner-readable)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_id      text not null,
  action      text not null,
  user_id     uuid,
  at          timestamptz not null default now(),
  diff        jsonb
);

create or replace function private.audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (table_name, row_id, action, user_id, diff)
  values (
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(new) ->> 'booking_id'), (to_jsonb(old) ->> 'id'), (to_jsonb(old) ->> 'booking_id')),
    tg_op,
    auth.uid(),
    case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_bookings after insert or update or delete on public.bookings
  for each row execute function private.audit();
create trigger audit_booking_finances after insert or update or delete on public.booking_finances
  for each row execute function private.audit();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function private.audit();
create trigger audit_expenses after insert or update or delete on public.expenses
  for each row execute function private.audit();

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger bookings_touch before update on public.bookings
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.properties          enable row level security;
alter table public.channels            enable row level security;
alter table public.expense_categories  enable row level security;
alter table public.exchange_rates      enable row level security;
alter table public.guests              enable row level security;
alter table public.guest_identity      enable row level security;
alter table public.bookings            enable row level security;
alter table public.booking_finances    enable row level security;
alter table public.booking_extras      enable row level security;
alter table public.payments            enable row level security;
alter table public.expenses            enable row level security;
alter table public.cleaning_tasks      enable row level security;
alter table public.maintenance_issues  enable row level security;
alter table public.inventory_items     enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.audit_log           enable row level security;

-- Profiles: members see the team; you can edit your own name/phone; owners manage everyone.
create policy profiles_read   on public.profiles for select to authenticated using ((select private.is_member()) or id = (select auth.uid()));
create policy profiles_self   on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_owner  on public.profiles for all    to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));

-- Reference data: every member reads, owners write.
create policy properties_read  on public.properties for select to authenticated using ((select private.is_member()));
create policy properties_owner on public.properties for all    to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy channels_read    on public.channels   for select to authenticated using ((select private.is_member()));
create policy channels_owner   on public.channels   for all    to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy categories_read  on public.expense_categories for select to authenticated using ((select private.is_member()));
create policy categories_owner on public.expense_categories for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy fx_read          on public.exchange_rates for select to authenticated using ((select private.is_member()));
create policy fx_owner         on public.exchange_rates for all    to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));

-- Guests & bookings: staff create/read/update; only owners delete.
create policy guests_read   on public.guests for select to authenticated using ((select private.is_member()));
create policy guests_insert on public.guests for insert to authenticated with check ((select private.is_member()));
create policy guests_update on public.guests for update to authenticated using ((select private.is_member())) with check ((select private.is_member()));
create policy guests_delete on public.guests for delete to authenticated using ((select private.is_owner()));

create policy guest_identity_owner on public.guest_identity for all to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));

create policy bookings_read   on public.bookings for select to authenticated using ((select private.is_member()));
create policy bookings_insert on public.bookings for insert to authenticated with check ((select private.is_member()));
create policy bookings_update on public.bookings for update to authenticated using ((select private.is_member())) with check ((select private.is_member()));
create policy bookings_delete on public.bookings for delete to authenticated using ((select private.is_owner()));

-- Money: owners full; staff insert only (no select, so they can't read it back).
create policy finances_owner        on public.booking_finances for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy finances_staff_insert on public.booking_finances for insert to authenticated with check ((select private.is_member()));
create policy extras_owner          on public.booking_extras for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy extras_staff_insert   on public.booking_extras for insert to authenticated with check ((select private.is_member()));
create policy payments_owner        on public.payments for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy payments_staff_insert on public.payments for insert to authenticated with check ((select private.is_member()));

-- Expenses: staff create, and read/edit their own; owners everything.
create policy expenses_owner  on public.expenses for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy expenses_insert on public.expenses for insert to authenticated with check ((select private.is_member()) and created_by = (select auth.uid()));
create policy expenses_own_read   on public.expenses for select to authenticated using (created_by = (select auth.uid()));
create policy expenses_own_update on public.expenses for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

-- Operations: members full except delete (owners only).
create policy cleaning_read   on public.cleaning_tasks for select to authenticated using ((select private.is_member()));
create policy cleaning_insert on public.cleaning_tasks for insert to authenticated with check ((select private.is_member()));
create policy cleaning_update on public.cleaning_tasks for update to authenticated using ((select private.is_member())) with check ((select private.is_member()));
create policy cleaning_delete on public.cleaning_tasks for delete to authenticated using ((select private.is_owner()));

create policy maint_read   on public.maintenance_issues for select to authenticated using ((select private.is_member()));
create policy maint_insert on public.maintenance_issues for insert to authenticated with check ((select private.is_member()));
create policy maint_update on public.maintenance_issues for update to authenticated using ((select private.is_member())) with check ((select private.is_member()));
create policy maint_delete on public.maintenance_issues for delete to authenticated using ((select private.is_owner()));

create policy inv_read   on public.inventory_items for select to authenticated using ((select private.is_member()));
create policy inv_insert on public.inventory_items for insert to authenticated with check ((select private.is_member()));
create policy inv_update on public.inventory_items for update to authenticated using ((select private.is_member())) with check ((select private.is_member()));
create policy inv_delete on public.inventory_items for delete to authenticated using ((select private.is_owner()));

create policy invmov_read   on public.inventory_movements for select to authenticated using ((select private.is_member()));
create policy invmov_insert on public.inventory_movements for insert to authenticated with check ((select private.is_member()));

create policy audit_owner_read on public.audit_log for select to authenticated using ((select private.is_owner()));

-- ---------------------------------------------------------------------------
-- Reporting view (owner-only via security_invoker + finances RLS)
-- Revenue is recognised on STAY dates; shared expenses appear as "General".
-- ---------------------------------------------------------------------------
create or replace view public.booking_money
with (security_invoker = true) as
select
  b.id as booking_id,
  b.property_id,
  b.channel_id,
  b.check_in,
  b.check_out,
  b.nights,
  b.status,
  f.currency,
  f.fx_rate_usd_lkr,
  case f.currency when 'USD' then f.gross_amount * f.fx_rate_usd_lkr else f.gross_amount end as gross_lkr,
  case f.currency when 'USD' then f.commission_amount * f.fx_rate_usd_lkr else f.commission_amount end as commission_lkr,
  coalesce((select sum(case e.currency when 'USD' then e.amount * f.fx_rate_usd_lkr else e.amount end)
            from public.booking_extras e where e.booking_id = b.id), 0) as extras_lkr,
  coalesce((select sum(case p.currency when 'USD' then p.amount * p.fx_rate_usd_lkr else p.amount end)
            from public.payments p where p.booking_id = b.id and not p.voided), 0) as paid_lkr,
  f.payout_status
from public.bookings b
join public.booking_finances f on f.booking_id = b.id;

-- ---------------------------------------------------------------------------
-- Receipts storage (private bucket)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (select private.is_member()));
create policy receipts_read on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((select private.is_owner()) or owner = (select auth.uid())));
