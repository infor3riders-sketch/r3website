-- Sponsors & partners with logos, shown on the public Home page and managed by admins in the portal.
-- Replaces the names-only `partners` site setting; any names already entered there are carried over.

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  -- object path in the public-media bucket (sponsors/<id>/<file>); null shows the name instead
  logo_path text,
  website_url text check (website_url is null or website_url ~* '^https?://'),
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sponsors enable row level security;

create policy sponsors_public_read on public.sponsors
  for select to anon, authenticated using (is_public);
create policy sponsors_admin_all on public.sponsors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.sponsors from anon;
grant select on public.sponsors to anon;

create trigger audit_row after insert or update or delete on public.sponsors
  for each row execute function public.audit_row();

insert into public.sponsors (name, sort_order)
select btrim(p ->> 'name'), (t.ord - 1)::int
from public.site_settings s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) with ordinality as t(p, ord)
where s.key = 'partners' and length(btrim(coalesce(p ->> 'name', ''))) between 1 and 120;

delete from public.site_settings where key = 'partners';
