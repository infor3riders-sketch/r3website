-- Portal access toggle (admin can revoke/restore any account) and a login activity log.

-- ---------------------------------------------------------------------------
-- Access toggle. When off, the role helpers return false (so every RLS policy denies),
-- and the app bans the auth user so they cannot sign in or refresh a session.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists portal_access boolean not null default true,
  add column if not exists access_changed_at timestamptz,
  add column if not exists access_changed_by uuid references public.profiles (id) on delete set null;

create or replace function public.is_officer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active' and portal_access and role in ('officer', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active' and portal_access and role = 'admin'
  );
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and status = 'active' and portal_access
  );
$$;

-- Members cannot change their own access fields.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change roles' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       or new.member_since is distinct from old.member_since
       or new.membership_type_id is distinct from old.membership_type_id
       or new.email is distinct from old.email
       or new.portal_access is distinct from old.portal_access
       or new.access_changed_at is distinct from old.access_changed_at
       or new.access_changed_by is distinct from old.access_changed_by
       or new.id is distinct from old.id then
      raise exception 'Only admins can change membership status fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Audit: profiles log identity, role, status and access only (personal data stays out of the log).
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_table_name = 'profiles' then
    old_j := case when old_j is null then null else jsonb_build_object('id', old_j -> 'id', 'role', old_j -> 'role', 'status', old_j -> 'status', 'portal_access', old_j -> 'portal_access') end;
    new_j := case when new_j is null then null else jsonb_build_object('id', new_j -> 'id', 'role', new_j -> 'role', 'status', new_j -> 'status', 'portal_access', new_j -> 'portal_access') end;
    if tg_op = 'UPDATE' and old_j = new_j then
      return new;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, table_name, row_id, old_data, new_data)
  values ((select auth.uid()), lower(tg_op), tg_table_name, coalesce(rec ->> 'id', rec ->> 'key'), old_j, new_j);
  return coalesce(new, old);
end;
$$;

-- Wider activity coverage: portal content and member participation.
do $$
declare t text;
begin
  foreach t in array array[
    'events', 'event_rsvps', 'event_attendance', 'programs', 'volunteer_slots', 'volunteer_signups',
    'announcements', 'news_posts', 'gallery_albums', 'dues_periods', 'products', 'product_variants', 'motorcycles'
  ]
  loop
    if not exists (select 1 from pg_trigger where tgname = 'audit_row' and tgrelid = format('public.%I', t)::regclass) then
      execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Login activity: sign-ins, sign-outs, failed attempts and access changes.
-- Written only by server code with the service role; readable by admins only.
-- ---------------------------------------------------------------------------
create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  profile_id uuid references public.profiles (id) on delete set null,
  email text,
  event text not null check (event in ('login', 'logout', 'login_failed', 'access_revoked', 'access_restored')),
  method text,
  detail text,
  actor_id uuid references public.profiles (id) on delete set null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists login_events_created_idx on public.login_events (created_at desc);
create index if not exists login_events_profile_idx on public.login_events (profile_id, created_at desc);

alter table public.login_events enable row level security;
revoke all on public.login_events from anon, authenticated;
grant select on public.login_events to authenticated;
create policy login_events_admin_read on public.login_events
  for select to authenticated using (public.is_admin());
