-- R3 Riders: Row Level Security policies. RLS is enabled on every table in 0002.
-- Roles: anon (public site), authenticated (+ profile role member|officer|admin via helpers).
-- Default is deny. Guest orders/donations are created ONLY by server code with the service role,
-- so anon has no policy on orders/order_items/donations/payments at all.
--
-- Note for app code: anon INSERT policies have no matching SELECT policy, so inserts from
-- public forms must not chain `.select()` (RETURNING needs SELECT). Use `{ count: 'exact' }` or
-- generate the id client-side.

-- ===========================================================================
-- profiles
-- ===========================================================================
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_select_officer on public.profiles
  for select to authenticated using (public.is_officer());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- admin may update anyone (role changes pass the guard_profile_update trigger only for admins)
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_delete_admin on public.profiles
  for delete to authenticated using (public.is_admin());
-- No INSERT policy: rows are created by the handle_new_user trigger.

-- ===========================================================================
-- motorcycles
-- ===========================================================================
create policy motorcycles_own on public.motorcycles
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy motorcycles_select_officer on public.motorcycles
  for select to authenticated using (public.is_officer());

-- ===========================================================================
-- membership_types
-- ===========================================================================
create policy membership_types_public_read on public.membership_types
  for select to anon, authenticated using (is_public and is_active);
create policy membership_types_admin_all on public.membership_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy membership_types_officer_read on public.membership_types
  for select to authenticated using (public.is_officer());

-- ===========================================================================
-- applications: public can only submit; officers review
-- ===========================================================================
create policy applications_public_insert on public.applications
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and reviewed_by is null and reviewed_at is null and review_notes is null and profile_id is null
  );
create policy applications_officer_select on public.applications
  for select to authenticated using (public.is_officer());
create policy applications_officer_update on public.applications
  for update to authenticated using (public.is_officer()) with check (public.is_officer());
create policy applications_admin_delete on public.applications
  for delete to authenticated using (public.is_admin());

-- ===========================================================================
-- contact_messages
-- ===========================================================================
create policy contact_public_insert on public.contact_messages
  for insert to anon, authenticated with check (status = 'new');
create policy contact_officer_select on public.contact_messages
  for select to authenticated using (public.is_officer());
create policy contact_officer_update on public.contact_messages
  for update to authenticated using (public.is_officer()) with check (public.is_officer());
create policy contact_admin_delete on public.contact_messages
  for delete to authenticated using (public.is_admin());

-- ===========================================================================
-- programs / volunteering
-- ===========================================================================
create policy programs_public_read on public.programs
  for select to anon using (is_public);
create policy programs_member_read on public.programs
  for select to authenticated using (is_public or public.is_member());
create policy programs_officer_all on public.programs
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy volunteer_slots_public_read on public.volunteer_slots
  for select to anon using (exists (select 1 from public.programs p where p.id = program_id and p.is_public));
create policy volunteer_slots_member_read on public.volunteer_slots
  for select to authenticated using (public.is_member());
create policy volunteer_slots_officer_all on public.volunteer_slots
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy volunteer_signups_public_insert on public.volunteer_signups
  for insert to anon
  with check (
    profile_id is null and status = 'pending' and hours is null
    and exists (select 1 from public.programs p where p.id = program_id and p.is_public and p.volunteer_enabled)
  );
create policy volunteer_signups_member_insert on public.volunteer_signups
  for insert to authenticated
  with check (
    (profile_id is null or profile_id = (select auth.uid())) and status = 'pending' and hours is null
  );
create policy volunteer_signups_member_select on public.volunteer_signups
  for select to authenticated using (profile_id = (select auth.uid()));
create policy volunteer_signups_member_cancel on public.volunteer_signups
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and status in ('pending', 'cancelled'));
create policy volunteer_signups_officer_all on public.volunteer_signups
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

-- ===========================================================================
-- events
-- ===========================================================================
create policy events_public_read on public.events
  for select to anon using (is_public);
create policy events_member_read on public.events
  for select to authenticated using (is_public or public.is_member());
create policy events_officer_all on public.events
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy event_rsvps_own on public.event_rsvps
  for all to authenticated
  using (profile_id = (select auth.uid()) and public.is_member())
  with check (profile_id = (select auth.uid()) and public.is_member());
create policy event_rsvps_officer_all on public.event_rsvps
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy event_interest_public_insert on public.event_interest
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.events e where e.id = event_id and e.is_public and e.public_interest_enabled
  ));
create policy event_interest_officer_select on public.event_interest
  for select to authenticated using (public.is_officer());

create policy event_attendance_own_read on public.event_attendance
  for select to authenticated using (profile_id = (select auth.uid()));
create policy event_attendance_own_waiver on public.event_attendance
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy event_attendance_officer_all on public.event_attendance
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

-- ===========================================================================
-- announcements
-- ===========================================================================
create policy announcements_member_read on public.announcements
  for select to authenticated using (public.is_member() and published_at <= now());
create policy announcements_officer_all on public.announcements
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy announcement_reads_own on public.announcement_reads
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ===========================================================================
-- news / gallery (public content; admin-managed)
-- ===========================================================================
create policy news_public_read on public.news_posts
  for select to anon, authenticated using (is_public and published_at <= now());
create policy news_officer_read on public.news_posts
  for select to authenticated using (public.is_officer());
create policy news_admin_all on public.news_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy gallery_albums_public_read on public.gallery_albums
  for select to anon, authenticated using (is_public);
create policy gallery_albums_admin_all on public.gallery_albums
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy gallery_photos_public_read on public.gallery_photos
  for select to anon, authenticated
  using (exists (select 1 from public.gallery_albums a where a.id = album_id and a.is_public));
create policy gallery_photos_admin_all on public.gallery_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- documents: role-gated
-- ===========================================================================
create policy documents_role_read on public.documents
  for select to authenticated
  using (
    public.is_admin()
    or (min_role = 'member' and public.is_member())
    or (min_role = 'officer' and public.is_officer())
  );
create policy documents_officer_write on public.documents
  for all to authenticated
  using (public.is_officer() and min_role <> 'admin' or public.is_admin())
  with check (public.is_officer() and min_role <> 'admin' or public.is_admin());

-- ===========================================================================
-- site_settings
-- ===========================================================================
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (is_public);
create policy site_settings_officer_read on public.site_settings
  for select to authenticated using (public.is_officer());
create policy site_settings_admin_all on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- dues
-- ===========================================================================
create policy dues_periods_member_read on public.dues_periods
  for select to authenticated using (public.is_member());
create policy dues_periods_officer_all on public.dues_periods
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy dues_payments_own_read on public.dues_payments
  for select to authenticated using (profile_id = (select auth.uid()));
create policy dues_payments_own_insert on public.dues_payments
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and public.is_member());
create policy dues_payments_own_update on public.dues_payments
  for update to authenticated
  using (profile_id = (select auth.uid()) and status in ('pending', 'rejected'))
  with check (profile_id = (select auth.uid()));
create policy dues_payments_officer_all on public.dues_payments
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

-- ===========================================================================
-- shop: public catalogue is read-only; officers manage; orders never readable by anon
-- ===========================================================================
create policy products_public_read on public.products
  for select to anon, authenticated using (is_active);
create policy products_officer_all on public.products
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy variants_public_read on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy variants_officer_all on public.product_variants
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy product_images_officer_all on public.product_images
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy discount_codes_officer_all on public.discount_codes
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy orders_own_read on public.orders
  for select to authenticated using (profile_id = (select auth.uid()));
create policy orders_officer_all on public.orders
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy order_items_own_read on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.profile_id = (select auth.uid())));
create policy order_items_officer_all on public.order_items
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

-- ===========================================================================
-- donations / campaigns
-- ===========================================================================
create policy campaigns_public_read on public.donation_campaigns
  for select to anon, authenticated using (is_public and is_active);
create policy campaigns_officer_all on public.donation_campaigns
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy donations_own_read on public.donations
  for select to authenticated using (profile_id = (select auth.uid()));
create policy donations_officer_all on public.donations
  for all to authenticated using (public.is_officer()) with check (public.is_officer());

create policy payments_officer_read on public.payments
  for select to authenticated using (public.is_officer());
-- payments rows are written by security-definer functions / service role only.

-- ===========================================================================
-- audit_log: admin read-only; written by triggers only
-- ===========================================================================
create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (public.is_admin());

-- rate_limits: no policies on purpose (service role only).

-- ===========================================================================
-- Table privileges: RLS decides rows, grants decide the surface. Keep anon minimal.
-- ===========================================================================
revoke all on all tables in schema public from anon;
grant select on
  public.membership_types, public.programs, public.volunteer_slots, public.events, public.news_posts,
  public.gallery_albums, public.gallery_photos, public.site_settings, public.products,
  public.product_variants, public.product_images, public.donation_campaigns
to anon;
grant insert on
  public.applications, public.contact_messages, public.volunteer_signups, public.event_interest
to anon;
