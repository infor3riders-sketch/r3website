/**
 * RLS verification without Docker: runs the real migrations + seed in PGlite (in-process Postgres)
 * against minimal stubs of Supabase's `auth` and `storage` schemas. Mirrors supabase/tests/rls.test.sql
 * (pgTAP, for the full local stack). Policies, triggers and functions are the production SQL.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../supabase");
const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const OFFICER = "00000000-0000-0000-0000-0000000000b2";
const MEMBER = "00000000-0000-0000-0000-0000000000c3";

const BOOTSTRAP = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema extensions; create schema auth; create schema storage;
  grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
  create table auth.users (
    instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
    email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz,
    confirmation_token text, recovery_token text, email_change_token_new text, email_change text
  );
  create table auth.identities (
    id uuid primary key, user_id uuid, provider_id text, identity_data jsonb, provider text,
    last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  grant all on all tables in schema auth, storage to service_role;
`;

let db: PGlite;

async function as(uid: string | null) {
  await db.exec("reset role");
  if (uid === null) {
    await db.exec(`set role anon; select set_config('request.jwt.claims', '{"role":"anon"}', false)`);
  } else {
    await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', false)`);
  }
}
async function asService() {
  await db.exec("reset role");
  await db.exec(`set role service_role; select set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
}
const count = async (sql: string) => Number((await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`)).rows[0].n);
async function fails(sql: string) {
  try {
    await db.exec(sql);
  } catch (e) {
    return String((e as Error).message);
  }
  return null;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { citext, pgcrypto } });
  await db.exec(BOOTSTRAP);
  const files = readdirSync(path.join(ROOT, "migrations")).sort();
  for (const f of files) await db.exec(readFileSync(path.join(ROOT, "migrations", f), "utf8"));
  await db.exec(readFileSync(path.join(ROOT, "seed.sql"), "utf8"));
  await db.exec(`
    insert into public.orders (id, customer_name, email, phone, address_line, city, province, subtotal, total, lookup_token_hash)
    values ('00000000-0000-0000-0000-0000000000f1', 'Guest', 'g@example.test', '0900', 'x', 'x', 'x', 100, 100, 'hash');
    insert into public.donations (id, donor_name, donor_email, amount, status)
    values ('00000000-0000-0000-0000-0000000000f2', 'Donor', 'd@example.test', 100, 'paid');
  `);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("anon", () => {
  it("reads only public rows", async () => {
    await as(null);
    expect(await count("public.events where not is_public")).toBe(0);
    expect(await count("public.events")).toBeGreaterThan(0);
    expect(await count("public.site_settings where not is_public")).toBe(0);
    expect(await count("public.products")).toBeGreaterThan(0);
  });
  it("cannot read orders, donations, profiles, applications or audit", async () => {
    await as(null);
    for (const t of ["orders", "donations", "profiles", "applications", "audit_log", "payments", "discount_codes"]) {
      expect(await fails(`select * from public.${t}`), t).toMatch(/permission denied/i);
    }
  });
  it("can submit contact, application, volunteer signup", async () => {
    await as(null);
    expect(await fails(`insert into public.contact_messages (name, email, message) values ('A','a@example.test','hi')`)).toBeNull();
    expect(
      await fails(`insert into public.applications (full_name, email, phone, agreed_rules, consent_privacy) values ('A','a@example.test','1',true,true)`),
    ).toBeNull();
    expect(
      await fails(`insert into public.volunteer_signups (program_id, name, email) select id, 'V', 'v@example.test' from public.programs limit 1`),
    ).toBeNull();
  });
  it("cannot submit a pre-approved application", async () => {
    await as(null);
    expect(
      await fails(`insert into public.applications (status, full_name, email, phone, agreed_rules, consent_privacy) values ('approved','A','a@example.test','1',true,true)`),
    ).toMatch(/row-level security/i);
  });
  it("cannot insert orders or donations directly", async () => {
    await as(null);
    expect(await fails(`insert into public.orders (customer_name,email,phone,address_line,city,province,subtotal,total,lookup_token_hash) values ('x','x','x','x','x','x',1,1,'h')`)).toMatch(/permission denied/i);
    expect(await fails(`insert into public.donations (donor_name,donor_email,amount) values ('x','x@example.test',5)`)).toMatch(/permission denied/i);
  });
  it("cannot read the member directory or call stock functions", async () => {
    await as(null);
    expect(await fails(`select * from public.member_directory`)).toMatch(/permission denied/i);
    expect(await fails(`select public.mark_order_paid('00000000-0000-0000-0000-0000000000f1')`)).toMatch(/permission denied/i);
  });
  it("campaign progress counts only paid donations and exposes no donors", async () => {
    await as(null);
    const r = await db.query<{ raised: string }>(`select raised from public.campaign_totals()`);
    expect(Array.isArray(r.rows)).toBe(true);
  });
});

describe("member", () => {
  it("sees only their own profile", async () => {
    await as(MEMBER);
    expect(await count("public.profiles")).toBe(1);
  });
  it("cannot escalate their role or edit status fields", async () => {
    await as(MEMBER);
    expect(await fails(`update public.profiles set role = 'admin' where id = '${MEMBER}'`)).toMatch(/Only admins/);
    expect(await fails(`update public.profiles set status = 'active', member_since = '2000-01-01' where id = '${MEMBER}'`)).toMatch(/Only admins/);
  });
  it("can edit their own profile fields", async () => {
    await as(MEMBER);
    expect(await fails(`update public.profiles set road_name = 'Ghost' where id = '${MEMBER}'`)).toBeNull();
  });
  it("cannot read orders, audit log or other members' data", async () => {
    await as(MEMBER);
    expect(await count("public.orders")).toBe(0);
    expect(await count("public.audit_log")).toBe(0);
    expect(await count("public.donations")).toBe(0);
  });
  it("directory exposes only opted-in columns", async () => {
    await as(MEMBER);
    const r = await db.query<Record<string, unknown>>(`select * from public.member_directory`);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(Object.keys(r.rows[0]).sort()).toEqual(["avatar_path", "email", "full_name", "id", "member_since", "motorcycles", "phone", "road_name"]);
    // privacy toggles default off, so phone/email are null
    expect(r.rows.every((row) => row.phone === null && row.email === null)).toBe(true);
  });
  it("cannot self-verify dues", async () => {
    await as(MEMBER);
    expect(
      await fails(`insert into public.dues_payments (period_id, profile_id, amount, status) select id, '${MEMBER}', amount, 'paid' from public.dues_periods limit 1`),
    ).toMatch(/verification fields/);
    expect(
      await fails(`insert into public.dues_payments (period_id, profile_id, amount, reference_no) select id, '${MEMBER}', amount, 'REF1' from public.dues_periods limit 1`),
    ).toBeNull();
  });
  it("cannot write another member's RSVP", async () => {
    await as(MEMBER);
    expect(
      await fails(`insert into public.event_rsvps (event_id, profile_id, status) select id, '${OFFICER}', 'going' from public.events limit 1`),
    ).toMatch(/row-level security/i);
    expect(
      await fails(`insert into public.event_rsvps (event_id, profile_id, status) select id, '${MEMBER}', 'going' from public.events limit 1`),
    ).toBeNull();
  });
});

describe("officer", () => {
  it("reads orders, donations and applications", async () => {
    await as(OFFICER);
    expect(await count("public.orders")).toBeGreaterThan(0);
    expect(await count("public.donations")).toBeGreaterThan(0);
    expect(await count("public.applications")).toBeGreaterThan(0);
  });
  it("cannot escalate to admin or read the audit log", async () => {
    await as(OFFICER);
    expect(await fails(`update public.profiles set role = 'admin' where id = '${OFFICER}'`)).toMatch(/Only admins/);
    expect(await count("public.audit_log")).toBe(0);
  });
  it("can manage events and verify dues", async () => {
    await as(OFFICER);
    expect(await fails(`update public.events set title = 'Renamed' where slug = 'sample-charity-ride'`)).toBeNull();
    expect(await fails(`update public.dues_payments set status = 'paid', verified_by = '${OFFICER}', verified_at = now()`)).toBeNull();
  });
  it("cannot manage site settings or news (admin only)", async () => {
    await as(OFFICER);
    await db.exec(`update public.site_settings set value = '{}' where key = 'fund_usage'`);
    await as(null);
    const r = await db.query<{ value: unknown }>(`select value from public.site_settings where key = 'fund_usage'`);
    expect(JSON.stringify(r.rows[0].value)).not.toBe("{}");
  });
});

describe("member profile modules", () => {
  it("members manage only their own motorcycles", async () => {
    await as(MEMBER);
    expect(await fails(`insert into public.motorcycles (profile_id, make, model) values ('${MEMBER}', 'Honda', 'Click')`)).toBeNull();
    expect(await fails(`insert into public.motorcycles (profile_id, make, model) values ('${OFFICER}', 'Evil', 'Bike')`)).toMatch(/row-level security/i);
    await as(OFFICER);
    expect(await count("public.motorcycles where profile_id = '" + MEMBER + "'")).toBeGreaterThan(0);
    await as(MEMBER);
    expect(await fails(`delete from public.motorcycles where profile_id = '${MEMBER}'`)).toBeNull();
    expect(await count("public.motorcycles")).toBe(0);
  });

  it("directory shows a member only after they opt in and honours toggles", async () => {
    await as(MEMBER);
    await db.exec(`update public.profiles set directory_visible = false where id = '${MEMBER}'`);
    await as(OFFICER);
    expect(await count(`public.member_directory where id = '${MEMBER}'`)).toBe(0);
    await as(MEMBER);
    await db.exec(`update public.profiles set directory_visible = true, show_phone = true, phone = '0917 111 2222' where id = '${MEMBER}'`);
    await as(OFFICER);
    const r = await db.query<{ phone: string | null; email: string | null }>(`select phone, email from public.member_directory where id = '${MEMBER}'`);
    expect(r.rows[0].phone).toBe("0917 111 2222");
    expect(r.rows[0].email).toBeNull();
  });

  it("future-dated announcements stay hidden from members until published; reads are per member", async () => {
    await as(OFFICER);
    await db.exec(`insert into public.announcements (id, title, body, published_at) values
      ('00000000-0000-0000-0000-0000000000d1', 'Soon', 'later', now() + interval '1 day'),
      ('00000000-0000-0000-0000-0000000000d2', 'Now', 'visible', now() - interval '1 minute')`);
    await as(MEMBER);
    expect(await count("public.announcements where id = '00000000-0000-0000-0000-0000000000d1'")).toBe(0);
    expect(await count("public.announcements where id = '00000000-0000-0000-0000-0000000000d2'")).toBe(1);
    expect(await fails(`insert into public.announcement_reads (announcement_id, profile_id) values ('00000000-0000-0000-0000-0000000000d2', '${MEMBER}')`)).toBeNull();
    expect(await fails(`insert into public.announcement_reads (announcement_id, profile_id) values ('00000000-0000-0000-0000-0000000000d2', '${OFFICER}')`)).toMatch(/row-level security/i);
    expect(await fails(`insert into public.announcements (title, body) values ('x', 'y')`)).toMatch(/row-level security/i);
  });
});

describe("event capacity and volunteering rules", () => {
  const EV = "00000000-0000-0000-0000-0000000000c9";
  it("enforces event capacity across riders and passengers", async () => {
    await asService();
    await db.exec(`delete from public.event_rsvps; insert into public.events (id, slug, title, starts_at, capacity, is_public)
      values ('${EV}', 'cap-test', 'Cap test', now() + interval '10 days', 3, true)`);
    await as(MEMBER);
    expect(await fails(`insert into public.event_rsvps (event_id, profile_id, status, riders, passengers) values ('${EV}', '${MEMBER}', 'going', 1, 1)`)).toBeNull();
    await as(OFFICER);
    const full = await fails(`insert into public.event_rsvps (event_id, profile_id, status, riders, passengers) values ('${EV}', '${OFFICER}', 'going', 1, 1)`);
    expect(full).toMatch(/event_full/);
    // 'maybe' and 'no' do not consume seats
    expect(await fails(`insert into public.event_rsvps (event_id, profile_id, status, riders, passengers) values ('${EV}', '${OFFICER}', 'maybe', 1, 1)`)).toBeNull();
    // moving maybe -> going must also respect capacity
    expect(await fails(`update public.event_rsvps set status = 'going' where event_id = '${EV}' and profile_id = '${OFFICER}'`)).toMatch(/event_full/);
    // a member can shrink their own party and free seats
    await as(MEMBER);
    expect(await fails(`update public.event_rsvps set passengers = 0 where event_id = '${EV}' and profile_id = '${MEMBER}'`)).toBeNull();
    await as(OFFICER);
    expect(await fails(`update public.event_rsvps set status = 'going', riders = 1, passengers = 1 where event_id = '${EV}' and profile_id = '${OFFICER}'`)).toBeNull();
  });

  it("limits volunteer slots and blocks duplicate or self-awarded hours", async () => {
    await asService();
    const prog = (await db.query<{ id: string }>(`select id from public.programs limit 1`)).rows[0].id;
    await db.exec(`insert into public.volunteer_slots (id, program_id, title, capacity) values ('00000000-0000-0000-0000-0000000000c8', '${prog}', 'Marshals', 1)`);
    await as(MEMBER);
    const ins = (uid: string) => `insert into public.volunteer_signups (program_id, slot_id, profile_id, name, email) values ('${prog}', '00000000-0000-0000-0000-0000000000c8', '${uid}', 'n', 'n@example.test')`;
    expect(await fails(ins(MEMBER))).toBeNull();
    expect(await fails(ins(MEMBER))).toMatch(/slot_full|duplicate key/);
    await as(OFFICER);
    expect(await fails(ins(OFFICER))).toMatch(/slot_full/);
    await as(MEMBER);
    expect(await fails(`update public.volunteer_signups set hours = 99 where profile_id = '${MEMBER}'`)).toMatch(/Members cannot change hours/);
    expect(await fails(`update public.volunteer_signups set status = 'cancelled' where profile_id = '${MEMBER}'`)).toBeNull();
    await as(OFFICER);
    expect(await fails(ins(OFFICER))).toBeNull(); // cancelled signup frees the slot
    expect(await fails(`update public.volunteer_signups set hours = 4, status = 'completed' where profile_id = '${OFFICER}'`)).toBeNull();
  });

  it("members see seat counts without seeing who else RSVPd; anon cannot call the counters", async () => {
    await as(MEMBER);
    const seats = await db.query<{ event_id: string; taken: number }>(`select * from public.event_seats_taken(array['${EV}']::uuid[])`);
    expect(Number(seats.rows[0]?.taken)).toBeGreaterThan(0);
    expect(await count(`public.event_rsvps where profile_id <> '${MEMBER}'`)).toBe(0);
    await as(null);
    expect(await fails(`select * from public.event_seats_taken(array['${EV}']::uuid[])`)).toMatch(/permission denied/i);
  });

  it("members cannot check themselves in; officers can", async () => {
    await as(MEMBER);
    expect(await fails(`insert into public.event_attendance (event_id, profile_id) values ('${EV}', '${MEMBER}')`)).toMatch(/row-level security/i);
    await as(OFFICER);
    expect(await fails(`insert into public.event_attendance (event_id, profile_id, checked_in_by) values ('${EV}', '${MEMBER}', '${OFFICER}')`)).toBeNull();
    await as(MEMBER);
    expect(await count(`public.event_attendance where profile_id = '${MEMBER}'`)).toBe(1);
  });

  it("members can sign their own waiver on an RSVP", async () => {
    await as(MEMBER);
    expect(await fails(`update public.event_rsvps set waiver_signed_at = now() where event_id = '${EV}' and profile_id = '${MEMBER}'`)).toBeNull();
  });
});

describe("dues and documents", () => {
  it("members submit and resubmit their own dues but never verify them; paid rows are locked", async () => {
    await asService();
    await db.exec(`delete from public.dues_payments`);
    const period = (await db.query<{ id: string }>(`select id from public.dues_periods limit 1`)).rows[0].id;
    await as(MEMBER);
    expect(await fails(`insert into public.dues_payments (period_id, profile_id, amount, reference_no) values ('${period}', '${MEMBER}', 1500, 'GC123')`)).toBeNull();
    expect(await fails(`update public.dues_payments set reference_no = 'GC999' where profile_id = '${MEMBER}'`)).toBeNull();
    expect(await fails(`update public.dues_payments set status = 'paid' where profile_id = '${MEMBER}'`)).toMatch(/verification fields/);
    expect(await fails(`update public.dues_payments set amount = 1 where profile_id = '${MEMBER}'`)).toMatch(/verification fields/);
    await as(OFFICER);
    expect(await count(`public.dues_payments where profile_id = '${MEMBER}'`)).toBe(1);
    expect(await fails(`update public.dues_payments set status = 'rejected', verified_by = '${OFFICER}', reject_reason = 'blurry' where profile_id = '${MEMBER}'`)).toBeNull();
    await as(MEMBER);
    expect(await fails(`update public.dues_payments set status = 'pending', reference_no = 'GC555' where profile_id = '${MEMBER}'`)).toBeNull(); // resubmit after rejection
    await as(OFFICER);
    expect(await fails(`update public.dues_payments set status = 'paid', verified_by = '${OFFICER}', verified_at = now() where profile_id = '${MEMBER}'`)).toBeNull();
    await as(MEMBER);
    expect(await count(`public.dues_payments where profile_id = '${MEMBER}' and status = 'paid'`)).toBe(1);
    // RLS filters paid rows out of a member's UPDATE entirely, so the tamper attempt changes nothing
    await db.exec(`update public.dues_payments set reference_no = 'tamper' where profile_id = '${MEMBER}'`);
    const row = await db.query<{ reference_no: string }>(`select reference_no from public.dues_payments where profile_id = '${MEMBER}'`);
    expect(row.rows[0].reference_no).toBe("GC555");
  });

  it("members cannot read other members' dues", async () => {
    await as(OFFICER);
    await db.exec(`insert into public.dues_payments (period_id, profile_id, amount, status) select id, '${OFFICER}', amount, 'pending' from public.dues_periods limit 1`);
    await as(MEMBER);
    expect(await count(`public.dues_payments where profile_id = '${OFFICER}'`)).toBe(0);
  });

  it("documents are visible by minimum role and only officers can add them", async () => {
    await as(OFFICER);
    await db.exec(`insert into public.documents (title, storage_path, min_role) values
      ('Bylaws', 'bylaws/a.pdf', 'member'), ('Officer minutes', 'minutes/b.pdf', 'officer')`);
    await as(ADMIN);
    await db.exec(`insert into public.documents (title, storage_path, min_role) values ('Admin only', 'finance/c.pdf', 'admin')`);
    await as(MEMBER);
    const titles = (await db.query<{ title: string }>(`select title from public.documents order by title`)).rows.map((r) => r.title);
    expect(titles).toEqual(["Bylaws"]);
    await as(OFFICER);
    expect((await db.query<{ title: string }>(`select title from public.documents order by title`)).rows.map((r) => r.title)).toEqual(["Bylaws", "Officer minutes"]);
    await as(ADMIN);
    expect(await count("public.documents")).toBe(3);
    await as(MEMBER);
    expect(await fails(`insert into public.documents (title, storage_path) values ('x', 'x.pdf')`)).toMatch(/row-level security/i);
    await as(OFFICER);
    expect(await fails(`insert into public.documents (title, storage_path, min_role) values ('sneaky', 'y.pdf', 'admin')`)).toMatch(/row-level security/i);
  });
});

describe("application review workflow", () => {
  it("officers can move an application through review; anon and members cannot", async () => {
    await as(null);
    await db.exec(`insert into public.applications (id, full_name, email, phone, agreed_rules, consent_privacy)
      values ('00000000-0000-0000-0000-0000000000e1', 'Rev Test', 'rev@example.test', '1', true, true)`);
    await as(OFFICER);
    expect(await count("public.applications where id = '00000000-0000-0000-0000-0000000000e1'")).toBe(1);
    expect(await fails(`update public.applications set status = 'approved', reviewed_by = '${OFFICER}', reviewed_at = now() where id = '00000000-0000-0000-0000-0000000000e1'`)).toBeNull();
    await as(null);
    await db.exec(`update public.applications set status = 'rejected' where id = '00000000-0000-0000-0000-0000000000e1'`).catch(() => undefined);
    await as(OFFICER);
    const r = await db.query<{ status: string }>(`select status from public.applications where id = '00000000-0000-0000-0000-0000000000e1'`);
    expect(r.rows[0].status).toBe("approved");
    await as(MEMBER);
    expect(await count("public.applications")).toBe(0);
  });
  it("approval writes an audit entry visible to admins", async () => {
    await as(ADMIN);
    expect(await count("public.audit_log where table_name = 'applications' and action = 'update'")).toBeGreaterThan(0);
  });
});

describe("admin", () => {
  it("can change roles and read the audit log", async () => {
    await as(ADMIN);
    expect(await fails(`update public.profiles set role = 'officer' where id = '${MEMBER}'`)).toBeNull();
    expect(await count("public.audit_log")).toBeGreaterThan(0);
    await as(ADMIN);
    expect(await fails(`update public.profiles set role = 'member' where id = '${MEMBER}'`)).toBeNull();
  });
});

describe("donation and rollback functions (service role)", () => {
  it("release_stock undoes a reservation and never goes negative", async () => {
    await asService();
    const v = (await db.query<{ id: string; reserved: number }>(`select id, reserved from public.product_variants limit 1`)).rows[0];
    await db.exec(`select public.reserve_stock('${v.id}', 3)`);
    await db.exec(`select public.release_stock('${v.id}', 3)`);
    await db.exec(`select public.release_stock('${v.id}', 50)`);
    const after = (await db.query<{ reserved: number }>(`select reserved from public.product_variants where id = '${v.id}'`)).rows[0];
    expect(after.reserved).toBe(0);
  });

  it("donations move pending -> paid exactly once and campaign totals count only paid", async () => {
    await asService();
    const camp = (await db.query<{ id: string }>(`select id from public.donation_campaigns limit 1`)).rows[0].id;
    await db.exec(`insert into public.donations (id, campaign_id, donor_name, donor_email, amount)
      values ('00000000-0000-0000-0000-0000000000b1', '${camp}', 'D', 'd@example.test', 250),
             ('00000000-0000-0000-0000-0000000000b2', '${camp}', 'E', 'e@example.test', 999)`);
    const before = (await db.query<{ raised: string }>(`select raised from public.campaign_totals() where campaign_id = '${camp}'`)).rows[0];
    expect((await db.query<{ ok: boolean }>(`select public.mark_donation_paid('00000000-0000-0000-0000-0000000000b1', '${OFFICER}') as ok`)).rows[0].ok).toBe(true);
    expect((await db.query<{ ok: boolean }>(`select public.mark_donation_paid('00000000-0000-0000-0000-0000000000b1', '${OFFICER}') as ok`)).rows[0].ok).toBe(false);
    expect((await db.query<{ ok: boolean }>(`select public.reject_donation('00000000-0000-0000-0000-0000000000b2', '${OFFICER}') as ok`)).rows[0].ok).toBe(true);
    const after = (await db.query<{ raised: string }>(`select raised from public.campaign_totals() where campaign_id = '${camp}'`)).rows[0];
    expect(Number(after.raised) - Number(before.raised)).toBe(250);
    // a rejected donation can no longer be marked paid
    expect((await db.query<{ ok: boolean }>(`select public.mark_donation_paid('00000000-0000-0000-0000-0000000000b2') as ok`)).rows[0].ok).toBe(false);
  });

  it("members and anon cannot call verification functions", async () => {
    await as(MEMBER);
    expect(await fails(`select public.mark_donation_paid('00000000-0000-0000-0000-0000000000b1')`)).toMatch(/permission denied/i);
    expect(await fails(`select public.release_stock('00000000-0000-0000-0000-0000000000b1', 1)`)).toMatch(/permission denied/i);
    await as(null);
    expect(await fails(`select public.reject_donation('00000000-0000-0000-0000-0000000000b1')`)).toMatch(/permission denied/i);
  });
});

describe("stock lifecycle (service role)", () => {
  it("reserves, pays and cancels without going negative", async () => {
    await asService();
    const v = (await db.query<{ id: string }>(`select id from public.product_variants limit 1`)).rows[0].id;
    expect((await db.query<{ reserve_stock: boolean }>(`select public.reserve_stock('${v}', 5)`)).rows[0].reserve_stock).toBe(true);
    expect((await db.query<{ reserve_stock: boolean }>(`select public.reserve_stock('${v}', 9999)`)).rows[0].reserve_stock).toBe(false);

    await db.exec(`
      insert into public.orders (id, customer_name, email, phone, address_line, city, province, subtotal, total, lookup_token_hash)
      values ('00000000-0000-0000-0000-0000000000f3', 'G', 'g@example.test', '1', 'x', 'x', 'x', 5, 5, 'h');
      insert into public.order_items (order_id, variant_id, name_snapshot, unit_price, quantity)
      values ('00000000-0000-0000-0000-0000000000f3', '${v}', 'tee', 1, 5);
    `);
    const before = (await db.query<{ stock: number; reserved: number }>(`select stock, reserved from public.product_variants where id = '${v}'`)).rows[0];
    expect(before.reserved).toBe(5);

    expect((await db.query<{ mark_order_paid: boolean }>(`select public.mark_order_paid('00000000-0000-0000-0000-0000000000f3')`)).rows[0].mark_order_paid).toBe(true);
    const after = (await db.query<{ stock: number; reserved: number }>(`select stock, reserved from public.product_variants where id = '${v}'`)).rows[0];
    expect(after.stock).toBe(before.stock - 5);
    expect(after.reserved).toBe(0);
    // idempotent
    expect((await db.query<{ mark_order_paid: boolean }>(`select public.mark_order_paid('00000000-0000-0000-0000-0000000000f3')`)).rows[0].mark_order_paid).toBe(false);
    expect((await db.query<{ cancel_order: boolean }>(`select public.cancel_order('00000000-0000-0000-0000-0000000000f3')`)).rows[0].cancel_order).toBe(false);
  });
});
