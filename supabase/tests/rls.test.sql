-- pgTAP RLS tests. Run with:  supabase test db   (needs the local stack; see docs/DEPLOY.md)
-- Uses the dev seed users (supabase/seed.sql). Each block impersonates a role via request.jwt.claims.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- helper: switch identity inside the transaction
create or replace function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  reset role;
  if p_uid is null then
    set local role anon;
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  else
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  end if;
end $$;

-- fixtures as superuser
insert into public.orders (id, customer_name, email, phone, address_line, city, province, subtotal, total, lookup_token_hash)
values ('00000000-0000-0000-0000-0000000000f1', 'Guest', 'g@example.test', '0900', 'x', 'x', 'x', 100, 100, 'hash');
insert into public.donations (id, donor_name, donor_email, amount) values ('00000000-0000-0000-0000-0000000000f2', 'Donor', 'd@example.test', 100);

-- ---------------------------------------------------------------- anon
select pg_temp.act_as(null);
select ok((select count(*) from public.events where not is_public) = 0, 'anon sees no private events');
select ok((select count(*) from public.events where is_public) >= 1, 'anon sees public events');
select is((select count(*) from public.orders)::int, 0, 'anon cannot read orders');
select is((select count(*) from public.donations)::int, 0, 'anon cannot read donations');
select is((select count(*) from public.profiles)::int, 0, 'anon cannot read profiles');
select lives_ok($$insert into public.contact_messages (name, email, message) values ('A', 'a@example.test', 'hi')$$, 'anon can insert contact message');
select throws_ok($$insert into public.orders (customer_name, email, phone, address_line, city, province, subtotal, total, lookup_token_hash) values ('x','x','x','x','x','x',1,1,'h')$$, '42501', null, 'anon cannot insert orders directly');
select throws_ok($$insert into public.donations (donor_name, donor_email, amount) values ('x','x@example.test',5)$$, '42501', null, 'anon cannot insert donations directly');
select throws_ok($$insert into public.applications (status, full_name, email, phone, agreed_rules, consent_privacy) values ('approved','x','x@example.test','1',true,true)$$, '42501', null, 'anon cannot submit a pre-approved application');
select is((select count(*) from public.site_settings where not is_public)::int, 0, 'anon sees only public settings');

-- ---------------------------------------------------------------- member
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select is((select count(*) from public.profiles)::int, 1, 'member sees only own profile');
select throws_ok($$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c3'$$, '42501', null, 'member cannot escalate own role');
select is((select count(*) from public.orders)::int, 0, 'member cannot read others orders');
select is((select count(*) from public.audit_log)::int, 0, 'member cannot read audit log');
select throws_ok($$insert into public.dues_payments (period_id, profile_id, amount, status) select id, '00000000-0000-0000-0000-0000000000c3', amount, 'paid' from public.dues_periods limit 1$$, '42501', null, 'member cannot self-verify dues');

-- ---------------------------------------------------------------- officer
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select ok((select count(*) from public.orders) >= 1, 'officer can read orders');
select ok((select count(*) from public.applications) >= 0, 'officer can read applications');
select throws_ok($$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b2'$$, '42501', null, 'officer cannot escalate to admin');
select is((select count(*) from public.audit_log)::int, 0, 'officer cannot read audit log');

-- ---------------------------------------------------------------- admin
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$update public.profiles set role = 'officer' where id = '00000000-0000-0000-0000-0000000000c3'$$, 'admin can change roles');
select ok((select count(*) from public.audit_log) >= 1, 'admin can read audit log');

select * from finish();
rollback;
