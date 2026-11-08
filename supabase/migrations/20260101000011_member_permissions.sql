-- Member permissions: admin-controlled switches for what regular members may change themselves.
-- Stored as the private site_settings row 'member_permissions' ({ "<key>": true|false }).
-- A missing row or missing key means ALLOWED (the behaviour before this migration).
-- Officers and admins are never restricted. Enforced here in RLS, not only in the UI.
-- 'print_roster' (default off) is an app-level gate only: the printable list reads public.member_directory,
-- which members can already see, so there is nothing extra to protect in RLS.

insert into public.site_settings (key, value, is_public)
values ('member_permissions', '{"edit_profile": true, "manage_motorcycles": true, "rsvp": true, "volunteer": true, "submit_dues": true, "print_roster": false}'::jsonb, false)
on conflict (key) do nothing;

create or replace function public.member_may(perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_officer() or coalesce(
    (select (s.value -> perm) is distinct from 'false'::jsonb from public.site_settings s where s.key = 'member_permissions'),
    true
  );
$$;
revoke all on function public.member_may(text) from public;
grant execute on function public.member_may(text) to authenticated;

-- profiles: own update needs edit_profile
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and public.member_may('edit_profile'))
  with check (id = (select auth.uid()));

-- avatars: own uploads need edit_profile
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and public.member_may('edit_profile'));
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and public.member_may('edit_profile'));
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and public.member_may('edit_profile'));

-- motorcycles: always readable by the owner; writes need manage_motorcycles
drop policy if exists motorcycles_own on public.motorcycles;
create policy motorcycles_select_own on public.motorcycles
  for select to authenticated using (profile_id = (select auth.uid()));
create policy motorcycles_insert_own on public.motorcycles
  for insert to authenticated with check (profile_id = (select auth.uid()) and public.member_may('manage_motorcycles'));
create policy motorcycles_update_own on public.motorcycles
  for update to authenticated
  using (profile_id = (select auth.uid()) and public.member_may('manage_motorcycles'))
  with check (profile_id = (select auth.uid()));
create policy motorcycles_delete_own on public.motorcycles
  for delete to authenticated using (profile_id = (select auth.uid()) and public.member_may('manage_motorcycles'));

-- event RSVPs: own rows always readable; writes need rsvp
drop policy if exists event_rsvps_own on public.event_rsvps;
create policy event_rsvps_select_own on public.event_rsvps
  for select to authenticated using (profile_id = (select auth.uid()) and public.is_member());
create policy event_rsvps_insert_own on public.event_rsvps
  for insert to authenticated with check (profile_id = (select auth.uid()) and public.is_member() and public.member_may('rsvp'));
create policy event_rsvps_update_own on public.event_rsvps
  for update to authenticated
  using (profile_id = (select auth.uid()) and public.is_member() and public.member_may('rsvp'))
  with check (profile_id = (select auth.uid()) and public.is_member());
create policy event_rsvps_delete_own on public.event_rsvps
  for delete to authenticated using (profile_id = (select auth.uid()) and public.is_member() and public.member_may('rsvp'));

-- volunteer sign-ups: member sign-up and cancel need volunteer
drop policy if exists volunteer_signups_member_insert on public.volunteer_signups;
create policy volunteer_signups_member_insert on public.volunteer_signups
  for insert to authenticated
  with check (
    (profile_id is null or (profile_id = (select auth.uid()) and public.member_may('volunteer')))
    and status = 'pending' and hours is null
  );
drop policy if exists volunteer_signups_member_cancel on public.volunteer_signups;
create policy volunteer_signups_member_cancel on public.volunteer_signups
  for update to authenticated
  using (profile_id = (select auth.uid()) and public.member_may('volunteer'))
  with check (profile_id = (select auth.uid()) and status in ('pending', 'cancelled'));

-- dues payments: submitting needs submit_dues
drop policy if exists dues_payments_own_insert on public.dues_payments;
create policy dues_payments_own_insert on public.dues_payments
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and public.is_member() and public.member_may('submit_dues'));
drop policy if exists dues_payments_own_update on public.dues_payments;
create policy dues_payments_own_update on public.dues_payments
  for update to authenticated
  using (profile_id = (select auth.uid()) and status in ('pending', 'rejected') and public.member_may('submit_dues'))
  with check (profile_id = (select auth.uid()));
