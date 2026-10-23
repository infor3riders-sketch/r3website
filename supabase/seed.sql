-- =============================================================================
-- DEV-ONLY SEED DATA. DO NOT RUN IN PRODUCTION.
-- Runs automatically on `supabase db reset`. All people, amounts and organisations are fictional.
-- Dev logins (password for all: DevPassw0rd!):
--   admin@dev.r3riders.test   (admin)
--   officer@dev.r3riders.test (officer)
--   member@dev.r3riders.test  (member)
-- =============================================================================

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-0000-0000-0000000000a1'::uuid, 'admin@dev.r3riders.test',   'Dev Admin',   'admin'::public.user_role),
      ('00000000-0000-0000-0000-0000000000b2'::uuid, 'officer@dev.r3riders.test', 'Dev Officer', 'officer'::public.user_role),
      ('00000000-0000-0000-0000-0000000000c3'::uuid, 'member@dev.r3riders.test',  'Dev Member',  'member'::public.user_role)
    ) as t(id, email, name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('DevPassw0rd!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name), now(), now(),
      '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now())
    on conflict do nothing;

    update public.profiles
       set role = u.role, member_since = current_date, directory_visible = true, road_name = initcap(u.role::text) || ' Rider'
     where id = u.id;
  end loop;
end $$;

insert into public.membership_types (slug, name, description, requirements, fee_amount, benefits, sort_order) values
  ('riding-member', 'Riding Member', 'Full member who rides with the club.', 'Valid driver''s license, registered motorcycle, two references.', 1500, array['Voting rights', 'Club ride priority', 'Member directory'], 1),
  ('associate', 'Associate / Supporter', 'Supports club activities without riding membership.', 'Good standing in the community.', 500, array['Event invitations', 'Volunteer access'], 2),
  ('volunteer', 'Volunteer', 'Helps with charity rides and outreach.', 'Willingness to help.', 0, array['Volunteer hours recorded'], 3);

insert into public.programs (slug, title, summary, description, schedule, how_to_join, is_public, sort_order) values
  ('charity-rides', 'Charity Rides', 'Rides that raise funds and awareness.', 'DEV PLACEHOLDER: describe the charity ride program.', 'Quarterly', 'Sign up as a volunteer or join as a riding member.', true, 1),
  ('community-outreach', 'Community Outreach', 'Hands-on service in nearby communities.', 'DEV PLACEHOLDER: outreach description.', 'Monthly', 'Volunteer through the form on this page.', true, 2),
  ('volunteer-program', 'Volunteer Program', 'Give your time to the mission.', 'DEV PLACEHOLDER: volunteer description.', 'Ongoing', 'Use the volunteer sign-up form.', true, 3),
  ('cooperative-initiatives', 'Cooperative Initiatives', 'Working with partner organisations.', 'DEV PLACEHOLDER: cooperative initiatives.', 'Ongoing', 'Contact us to partner.', true, 4);

insert into public.events (slug, title, description, starts_at, meeting_point, requirements, capacity, is_public, public_interest_enabled, program_id)
select 'sample-charity-ride', 'Sample Charity Ride', 'DEV PLACEHOLDER event.', now() + interval '30 days', 'Meeting point TBA', 'Helmet, license, registered motorcycle', 60, true, true, id
from public.programs where slug = 'charity-rides';

insert into public.news_posts (slug, title, excerpt, body, is_public, published_at) values
  ('welcome', 'Welcome to the new R3 Riders site', 'DEV PLACEHOLDER news.', 'DEV PLACEHOLDER body.', true, now() - interval '2 days');

insert into public.announcements (title, body, pinned, author_id, published_at) values
  ('Welcome, riders', 'DEV PLACEHOLDER announcement.', true, '00000000-0000-0000-0000-0000000000b2', now());

insert into public.donation_campaigns (slug, title, description, goal_amount, is_public, is_active) values
  ('charity-ride-2026', 'Charity Ride 2026', 'DEV PLACEHOLDER campaign.', 50000, true, true);

insert into public.products (slug, name, description, category, is_active) values
  ('sample-tee', 'R3 Riders Tee (sample)', 'DEV PLACEHOLDER product.', 'Apparel', true);
insert into public.product_variants (product_id, sku, label, size, color, price_php, stock)
select id, 'TEE-BLK-' || s, 'Black / ' || s, s, 'Black', 450, 25 from public.products, unnest(array['S','M','L','XL']) s
where slug = 'sample-tee';

insert into public.discount_codes (code, kind, value, is_active) values ('DEVTEN', 'percent', 10, true);

insert into public.dues_periods (label, starts_on, due_on, amount) values ('2026 Annual Dues', '2026-01-01', '2026-03-31', 1500);

insert into public.site_settings (key, value, is_public) values
  ('payment_instructions', '{"gcash_number": "0900 000 0000", "gcash_name": "R3 Riders Inc. (DEV)", "bank_name": "Sample Bank", "bank_account": "0000-0000-00", "notes": "DEV PLACEHOLDER. Replace in the portal."}', true),
  ('fund_usage', '{"items": [{"label": "Charity ride beneficiaries", "pct": 60}, {"label": "Community outreach", "pct": 25}, {"label": "Operations", "pct": 15}]}', true),
  ('official_receipts_enabled', 'false', false);
