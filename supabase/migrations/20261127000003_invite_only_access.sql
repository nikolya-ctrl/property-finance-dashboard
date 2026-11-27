-- Invite-only access: a new login is only active if its email was invited.
-- Anyone else who signs up gets an inactive profile and sees nothing (RLS checks `active`).

create table private.invites (
  email       text primary key check (email = lower(email)),
  role        text not null default 'staff' check (role in ('owner', 'staff')),
  full_name   text not null default '',
  invited_at  timestamptz not null default now()
);

insert into private.invites (email, role, full_name)
values ('nikkistein11@gmail.com', 'owner', 'Nikolya');

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare inv private.invites;
begin
  select * into inv from private.invites where email = lower(new.email);
  insert into public.profiles (id, full_name, role, active)
  values (
    new.id,
    coalesce(nullif(inv.full_name, ''), new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(inv.role, 'staff'),
    inv.email is not null
  );
  return new;
end;
$$;

alter table public.profiles alter column active set default false;

-- Owners invite staff from Settings.
create or replace function public.invite_user(p_email text, p_role text default 'staff', p_name text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner() then raise exception 'Only owners can invite users'; end if;
  insert into private.invites (email, role, full_name) values (lower(trim(p_email)), p_role, p_name)
  on conflict (email) do update set role = excluded.role, full_name = excluded.full_name;
  update public.profiles p set role = p_role, active = true
    from auth.users u where u.id = p.id and lower(u.email) = lower(trim(p_email));
end;
$$;
revoke all on function public.invite_user(text, text, text) from public, anon;
grant execute on function public.invite_user(text, text, text) to authenticated;
