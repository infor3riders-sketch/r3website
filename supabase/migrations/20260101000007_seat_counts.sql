-- R3 Riders: aggregate seat counts for members. RLS lets members read only their own RSVPs and
-- volunteer sign-ups, so remaining capacity must come from security-definer aggregates that
-- expose counts only (never who signed up).

create or replace function public.event_seats_taken(p_events uuid[])
returns table (event_id uuid, taken integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.event_id, coalesce(sum(r.riders + r.passengers), 0)::integer
    from public.event_rsvps r
   where r.event_id = any (p_events) and r.status = 'going' and public.is_member()
   group by r.event_id;
$$;

create or replace function public.slot_seats_taken(p_slots uuid[])
returns table (slot_id uuid, taken integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.slot_id, count(*)::integer
    from public.volunteer_signups s
   where s.slot_id = any (p_slots) and s.status <> 'cancelled' and public.is_member()
   group by s.slot_id;
$$;

revoke all on function public.event_seats_taken(uuid[]), public.slot_seats_taken(uuid[]) from public, anon;
grant execute on function public.event_seats_taken(uuid[]), public.slot_seats_taken(uuid[]) to authenticated;
