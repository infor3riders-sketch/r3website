-- R3 Riders: core tables. RLS is enabled here and policies are defined in 0004.

-- ===========================================================================
-- Members
-- ===========================================================================
create table public.membership_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  requirements text,
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  benefits text[] not null default '{}',
  is_public boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per auth user, created by trigger. Role defaults to 'member' and is NEVER read
-- from user-editable metadata.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role public.user_role not null default 'member',
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  full_name text,
  road_name text,
  phone text,
  address text,
  avatar_path text,
  birthdate date,
  blood_type text check (blood_type is null or blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  membership_type_id uuid references public.membership_types (id) on delete set null,
  member_since date,
  -- directory privacy toggles (default private)
  directory_visible boolean not null default false,
  show_phone boolean not null default false,
  show_email boolean not null default false,
  show_motorcycles boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  make text not null,
  model text not null,
  year integer check (year between 1900 and 2100),
  displacement_cc integer check (displacement_cc is null or displacement_cc > 0),
  color text,
  plate_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index motorcycles_profile_idx on public.motorcycles (profile_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  status public.application_status not null default 'pending',
  membership_type_id uuid references public.membership_types (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  birthdate date,
  address text,
  road_name text,
  riding_years integer check (riding_years is null or riding_years >= 0),
  riding_experience text,
  license_number text,
  motorcycles jsonb not null default '[]'::jsonb,
  "references" jsonb not null default '[]'::jsonb,
  volunteer_interests text[] not null default '{}',
  agreed_rules boolean not null default false check (agreed_rules),
  consent_privacy boolean not null default false check (consent_privacy),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_status_idx on public.applications (status, created_at desc);

-- ===========================================================================
-- Programs, events, volunteering
-- ===========================================================================
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  description text,
  schedule text,
  how_to_join text,
  cover_path text,
  photo_paths text[] not null default '{}',
  volunteer_enabled boolean not null default true,
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  program_id uuid references public.programs (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_point text,
  route text,
  requirements text,
  capacity integer check (capacity is null or capacity > 0),
  requires_waiver boolean not null default false,
  public_interest_enabled boolean not null default false,
  is_public boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_starts_idx on public.events (starts_at);

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null,
  riders integer not null default 1 check (riders between 0 and 20),
  passengers integer not null default 0 check (passengers between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

-- Public "I'm interested" signals for events that enable them (no account needed).
create table public.event_interest (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references public.profiles (id) on delete set null,
  waiver_signed_at timestamptz,
  unique (event_id, profile_id)
);

create table public.volunteer_slots (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now()
);

create table public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  slot_id uuid references public.volunteer_slots (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  message text,
  hours numeric(6,2) check (hours is null or hours >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index volunteer_signups_program_idx on public.volunteer_signups (program_id);

-- ===========================================================================
-- Communication and content
-- ===========================================================================
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  pinned boolean not null default false,
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  cover_path text,
  is_public boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums (id) on delete cascade,
  path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'general',
  storage_path text not null unique,
  min_role public.user_role not null default 'member',
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  -- is_public rows are readable by anon (e.g. payment instructions shown at checkout)
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- Dues
-- ===========================================================================
create table public.dues_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  starts_on date not null,
  due_on date not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.dues_periods (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status public.payment_status not null default 'pending',
  reference_no text,
  proof_path text,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, profile_id)
);

-- ===========================================================================
-- Shop
-- ===========================================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text unique,
  label text not null,
  size text,
  color text,
  price_php numeric(12,2) not null check (price_php >= 0),
  stock integer not null default 0 check (stock >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reserved <= stock)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,
  alt text,
  sort_order integer not null default 0
);

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  kind public.discount_kind not null,
  value numeric(12,2) not null check (value > 0),
  min_subtotal numeric(12,2) not null default 0,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

create sequence public.order_seq start 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default (
    'R3-' || to_char(now() at time zone 'Asia/Manila', 'YYMM') || '-' || lpad(nextval('public.order_seq')::text, 5, '0')
  ),
  status public.order_status not null default 'pending_payment',
  profile_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  email text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  province text not null,
  postal_code text,
  notes text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  discount_code_id uuid references public.discount_codes (id) on delete set null,
  payment_method public.payment_method not null default 'manual',
  payment_reference text,
  payment_proof_path text,
  -- sha256 of the emailed lookup token; the raw token is never stored
  lookup_token_hash text not null,
  tracking_note text,
  paid_at timestamptz,
  expires_at timestamptz not null default (now() + interval '3 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  name_snapshot text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ===========================================================================
-- Donations
-- ===========================================================================
create table public.donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  goal_amount numeric(12,2) check (goal_amount is null or goal_amount > 0),
  cover_path text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_public boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.donation_campaigns (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  donor_name text not null,
  donor_email text not null,
  is_anonymous boolean not null default false,
  message text,
  amount numeric(12,2) not null check (amount >= 1),
  status public.payment_status not null default 'pending',
  payment_method public.payment_method not null default 'manual',
  payment_reference text,
  payment_proof_path text,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index donations_campaign_idx on public.donations (campaign_id, status);

-- Provider/ledger events (gateway webhooks, manual verifications).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('order', 'donation', 'dues')),
  subject_id uuid not null,
  provider public.payment_method not null,
  provider_ref text,
  amount numeric(12,2) not null,
  status public.payment_status not null,
  raw jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index payments_provider_ref_uidx on public.payments (provider, provider_ref) where provider_ref is not null;

-- ===========================================================================
-- Audit
-- ===========================================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ===========================================================================
-- updated_at triggers + RLS on EVERY table
-- ===========================================================================
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'updated_at'
      and c.table_name in (select table_name from information_schema.tables where table_type = 'BASE TABLE' and table_schema = 'public')
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;

  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
