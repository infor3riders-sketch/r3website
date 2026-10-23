-- R3 Riders: donation verification. Like orders, a donation becomes `paid` only through these
-- functions (officer action or verified gateway webhook), never from a client.

create or replace function public.mark_donation_paid(p_donation uuid, p_verifier uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare d public.donations;
begin
  select * into d from public.donations where id = p_donation for update;
  if not found or d.status <> 'pending' then
    return false;
  end if;
  update public.donations
     set status = 'paid', verified_by = p_verifier, verified_at = now()
   where id = p_donation;
  insert into public.payments (subject_type, subject_id, provider, amount, status, created_by)
  values ('donation', p_donation, d.payment_method, d.amount, 'paid', p_verifier);
  return true;
end;
$$;

create or replace function public.reject_donation(p_donation uuid, p_verifier uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare d public.donations;
begin
  select * into d from public.donations where id = p_donation for update;
  if not found or d.status <> 'pending' then
    return false;
  end if;
  update public.donations
     set status = 'rejected', verified_by = p_verifier, verified_at = now()
   where id = p_donation;
  return true;
end;
$$;

revoke all on function public.mark_donation_paid(uuid, uuid), public.reject_donation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_donation_paid(uuid, uuid), public.reject_donation(uuid, uuid) to service_role;
