-- R3 Riders: role helpers, triggers, directory view, stock/order functions.

-- ---------------------------------------------------------------------------
-- Role helpers (security definer + stable so policies on `profiles` do not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.is_officer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active' and role in ('officer', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active' and role = 'admin'
  );
$$;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and status = 'active'
  );
$$;

grant execute on function public.is_officer(), public.is_admin(), public.is_member() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- New auth user -> profile. Role is always 'member'; admins promote via the portal
-- (or SQL for the first admin). Metadata is user-editable, so it is never trusted for role.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync with auth.users.email.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- ---------------------------------------------------------------------------
-- Prevent privilege escalation: only admins can change role/status/membership fields.
-- auth.uid() is null for the service role and the SQL editor, which are trusted.
-- ---------------------------------------------------------------------------
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
       or new.id is distinct from old.id then
      raise exception 'Only admins can change membership status fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Members may only add proof/reference to their own dues rows; verification fields are officer-only.
create or replace function public.guard_dues_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.is_officer() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.verified_by is not null or new.verified_at is not null then
      raise exception 'Members cannot set verification fields' using errcode = '42501';
    end if;
  else
    if new.status is distinct from old.status and new.status <> 'pending'
       or new.verified_by is distinct from old.verified_by
       or new.verified_at is distinct from old.verified_at
       or new.amount is distinct from old.amount then
      raise exception 'Members cannot set verification fields' using errcode = '42501';
    end if;
    if old.status = 'paid' then
      raise exception 'Verified payments are locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_dues_payment
  before insert or update on public.dues_payments
  for each row execute function public.guard_dues_payment();

-- ---------------------------------------------------------------------------
-- Audit logging on sensitive tables
-- ---------------------------------------------------------------------------
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
  -- Minimise personal data in the log: profiles only log identity, role and status.
  if tg_table_name = 'profiles' then
    old_j := case when old_j is null then null else jsonb_build_object('id', old_j -> 'id', 'role', old_j -> 'role', 'status', old_j -> 'status') end;
    new_j := case when new_j is null then null else jsonb_build_object('id', new_j -> 'id', 'role', new_j -> 'role', 'status', new_j -> 'status') end;
    if tg_op = 'UPDATE' and old_j = new_j then
      return new;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, table_name, row_id, old_data, new_data)
  values ((select auth.uid()), lower(tg_op), tg_table_name, coalesce(rec ->> 'id', rec ->> 'key'), old_j, new_j);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'applications', 'dues_payments', 'orders', 'donations', 'payments',
    'site_settings', 'discount_codes', 'documents', 'membership_types', 'donation_campaigns'
  ]
  loop
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Member directory: a view (not row access) so blood type, emergency contacts etc. are
-- never exposed to other members, and privacy toggles are enforced in one place.
-- ---------------------------------------------------------------------------
create view public.member_directory
with (security_invoker = false) as
select
  p.id,
  p.full_name,
  p.road_name,
  p.avatar_path,
  p.member_since,
  case when p.show_phone then p.phone end as phone,
  case when p.show_email then p.email end as email,
  case when p.show_motorcycles then (
    select string_agg(concat_ws(' ', m.year::text, m.make, m.model), ', ')
    from public.motorcycles m where m.profile_id = p.id
  ) end as motorcycles
from public.profiles p
where p.directory_visible and p.status = 'active' and public.is_member();

revoke all on public.member_directory from public, anon;
grant select on public.member_directory to authenticated;

-- Campaign progress counts only verified ('paid') donations and exposes no donor rows.
create or replace function public.campaign_totals()
returns table (campaign_id uuid, raised numeric, donors bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         coalesce(sum(d.amount) filter (where d.status = 'paid'), 0),
         count(d.id) filter (where d.status = 'paid')
  from public.donation_campaigns c
  left join public.donations d on d.campaign_id = c.id
  where c.is_public and c.is_active
  group by c.id;
$$;
grant execute on function public.campaign_totals() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stock + order lifecycle (service role only; called by server code after validation)
--   stock    = units on hand
--   reserved = units held by pending orders
--   available = stock - reserved
-- ---------------------------------------------------------------------------
create or replace function public.reserve_stock(p_variant uuid, p_qty integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_qty <= 0 then return false; end if;
  update public.product_variants
     set reserved = reserved + p_qty
   where id = p_variant and is_active and stock - reserved >= p_qty;
  return found;
end;
$$;

-- Pending -> cancelled/expired: release reservations.
create or replace function public.cancel_order(p_order uuid, p_new_status public.order_status default 'cancelled')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare o public.orders;
begin
  if p_new_status not in ('cancelled', 'expired') then
    raise exception 'invalid terminal status %', p_new_status;
  end if;
  select * into o from public.orders where id = p_order for update;
  if not found or o.status <> 'pending_payment' then
    return false;
  end if;
  update public.product_variants v
     set reserved = greatest(v.reserved - i.quantity, 0)
    from public.order_items i
   where i.order_id = p_order and i.variant_id = v.id;
  update public.orders set status = p_new_status where id = p_order;
  return true;
end;
$$;

-- Pending -> paid: convert reservations into a real stock decrement. Idempotent.
create or replace function public.mark_order_paid(p_order uuid, p_verifier uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.status <> 'pending_payment' then
    return false;
  end if;
  update public.product_variants v
     set stock = greatest(v.stock - i.quantity, 0),
         reserved = greatest(v.reserved - i.quantity, 0)
    from public.order_items i
   where i.order_id = p_order and i.variant_id = v.id;
  update public.orders set status = 'paid', paid_at = now() where id = p_order;
  if o.discount_code_id is not null then
    update public.discount_codes set uses = uses + 1 where id = o.discount_code_id;
  end if;
  insert into public.payments (subject_type, subject_id, provider, amount, status, created_by)
  values ('order', p_order, o.payment_method, o.total, 'paid', p_verifier);
  return true;
end;
$$;

create or replace function public.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare r record; n integer := 0;
begin
  for r in select id from public.orders where status = 'pending_payment' and expires_at < now() loop
    if public.cancel_order(r.id, 'expired') then n := n + 1; end if;
  end loop;
  return n;
end;
$$;

revoke all on function
  public.reserve_stock(uuid, integer),
  public.cancel_order(uuid, public.order_status),
  public.mark_order_paid(uuid, uuid),
  public.expire_stale_orders()
from public, anon, authenticated;
grant execute on function
  public.reserve_stock(uuid, integer),
  public.cancel_order(uuid, public.order_status),
  public.mark_order_paid(uuid, uuid),
  public.expire_stale_orders()
to service_role;
