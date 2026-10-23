-- R3 Riders: enums, shared trigger helpers, rate limiting.
-- All timestamps are timestamptz; the app renders them in Asia/Manila. Money is PHP numeric(12,2).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.user_role as enum ('member', 'officer', 'admin');
create type public.application_status as enum ('pending', 'info_requested', 'approved', 'rejected');
create type public.rsvp_status as enum ('going', 'maybe', 'no');
create type public.payment_status as enum ('pending', 'paid', 'rejected', 'refunded', 'cancelled');
create type public.payment_method as enum ('manual', 'paymongo');
create type public.order_status as enum (
  'pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'expired'
);
create type public.discount_kind as enum ('percent', 'fixed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (server-side only; no RLS policies, service role access only).
-- Serverless-safe fixed-window counter used by public forms and checkout.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_secs integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_secs) * p_window_secs);
  h integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, bucket, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into h;

  -- opportunistic cleanup
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return h <= p_max;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
