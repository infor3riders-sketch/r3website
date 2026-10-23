-- R3 Riders: business rules for events, RSVPs and volunteering that must hold under concurrency,
-- so they live in the database rather than only in app code.

-- Ride waiver acknowledgement is stored on the member's own RSVP (members cannot insert attendance rows).
alter table public.event_rsvps add column waiver_signed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Event capacity: riders + passengers of 'going' RSVPs may not exceed events.capacity.
-- The event row is locked (FOR UPDATE) so two simultaneous RSVPs cannot both squeeze in.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer;
  used integer;
begin
  if new.status <> 'going' then
    return new;
  end if;
  select capacity into cap from public.events where id = new.event_id for update;
  if cap is null then
    return new;
  end if;
  select coalesce(sum(riders + passengers), 0) into used
    from public.event_rsvps
   where event_id = new.event_id and status = 'going' and id is distinct from new.id;
  if used + new.riders + new.passengers > cap then
    raise exception 'event_full' using errcode = 'P0001', detail = format('capacity %s, taken %s', cap, used);
  end if;
  return new;
end;
$$;

create trigger enforce_event_capacity
  before insert or update on public.event_rsvps
  for each row execute function public.enforce_event_capacity();

-- ---------------------------------------------------------------------------
-- Volunteer slots: capacity counts non-cancelled sign-ups; a member cannot take the same slot twice.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer;
  used integer;
begin
  if new.slot_id is null or new.status = 'cancelled' then
    return new;
  end if;
  select capacity into cap from public.volunteer_slots where id = new.slot_id for update;
  if cap is null then
    return new;
  end if;
  select count(*) into used from public.volunteer_signups
   where slot_id = new.slot_id and status <> 'cancelled' and id is distinct from new.id;
  if used + 1 > cap then
    raise exception 'slot_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_slot_capacity
  before insert or update on public.volunteer_signups
  for each row execute function public.enforce_slot_capacity();

create unique index volunteer_signups_slot_member_uidx
  on public.volunteer_signups (slot_id, profile_id)
  where slot_id is not null and profile_id is not null and status <> 'cancelled';

-- Members may not grant themselves volunteer hours or confirmation.
create or replace function public.guard_volunteer_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.is_officer() then
    return new;
  end if;
  if tg_op = 'UPDATE' and (new.hours is distinct from old.hours or new.profile_id is distinct from old.profile_id
     or new.slot_id is distinct from old.slot_id or new.program_id is distinct from old.program_id) then
    raise exception 'Members cannot change hours or assignment' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_volunteer_signup
  before update on public.volunteer_signups
  for each row execute function public.guard_volunteer_signup();

create index event_rsvps_event_idx on public.event_rsvps (event_id, status);
create index volunteer_slots_program_idx on public.volunteer_slots (program_id);
