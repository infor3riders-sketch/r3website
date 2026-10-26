# Deployment guide

One Next.js app, **one Vercel project with two domains**, **one Supabase project**.
Everything below is a checklist for the first deployment; nothing has been deployed yet.

> Placeholders: `www.r3riders.org` = public site, `portal.r3riders.org` = member portal, `<ref>` = Supabase project ref.

## 1. Supabase project

1. Create a project at supabase.com (pick the region closest to the Philippines, e.g. Singapore). Save the DB password.
2. Link and push the schema from this repo (all schema lives in `supabase/migrations`, no dashboard-only changes):
   ```bash
   pnpm dlx supabase login
   pnpm dlx supabase link --project-ref <ref>
   pnpm dlx supabase db push
   ```
   Do **not** run `supabase/seed.sql` in production. It creates dev logins with a known password and demo data.
3. **Authentication settings** (Dashboard > Authentication):
   - Sign In / Providers > Email: keep enabled, but turn **off "Allow new users to sign up"**. There is no open sign-up; members arrive by admin invite or approved application.
   - URL Configuration: Site URL `https://www.r3riders.org`; Redirect URLs (exact):
     - `https://portal.r3riders.org/auth/callback`
     - `https://portal.r3riders.org/accept-invite`
     - `https://portal.r3riders.org/reset-password`
   - Email Templates: paste the HTML from `supabase/templates/` (`invite.html`, `recovery.html`, `magic_link.html`). They link to the portal through `{{ .RedirectTo }}`, so do not change that part.
     (Alternatively `supabase config push` applies `supabase/config.toml`, including these templates.)
   - SMTP: configure custom SMTP (Resend SMTP works) so auth emails are not limited by Supabase's shared sender.
4. **Storage**: the migration creates `public-media`, `member-avatars`, `payment-proofs` and `documents` with size and MIME limits and policies. Confirm the four buckets exist; the last three must be **private**.
5. API keys (Settings > API): copy the project URL, `anon` key and `service_role` key. The service role key is a server secret: never expose it to the browser or commit it.

## 2. Vercel project

1. Import the repository. Framework preset: Next.js. Package manager: pnpm. No custom build command.
2. **Environment variables** (Production; add Preview as needed):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key (server only) |
   | `NEXT_PUBLIC_SITE_HOST` | `www.r3riders.org` |
   | `NEXT_PUBLIC_PORTAL_HOST` | `portal.r3riders.org` |
   | `NEXT_PUBLIC_SITE_PROTOCOL` | `https` |
   | `ORDER_TOKEN_SECRET` | 32+ random characters (`openssl rand -base64 32`). Required in production |
   | `CRON_SECRET` | long random string; Vercel sends it to the cron route |
   | `PAYMENT_PROVIDER` | `manual` (default) or `paymongo` |
   | `RESEND_API_KEY`, `EMAIL_FROM` | email provider (see section 5) |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | optional spam protection |
   | `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET` | only when PayMongo is enabled |

   `NEXT_PUBLIC_*` values are baked into the build: redeploy after changing them.
3. **Domains**: Settings > Domains, add both `www.r3riders.org` and `portal.r3riders.org` to the same project. The proxy (`src/proxy.ts`) picks the product from the host, so no separate deployment is needed. Redirect the apex `r3riders.org` to `www`.
4. **Cron**: `vercel.json` schedules `/api/cron/expire-orders` hourly (releases stock held by unpaid orders). On the Vercel Hobby plan cron jobs can run at most daily: change the schedule to `0 3 * * *`.

## 3. DNS

At the domain registrar:
- `www` CNAME to `cname.vercel-dns.com`
- `portal` CNAME to `cname.vercel-dns.com`
- apex `@` A record `76.76.21.21` (or the values Vercel shows), then redirect to `www` in Vercel.

Wait for Vercel to issue certificates for both hosts.

## 4. Create the first admin

There is no sign-up, so bootstrap one account by hand:

1. Supabase Dashboard > Authentication > Users > **Add user** (create with email + password, "Auto Confirm User" on).
2. Supabase SQL editor (runs as `postgres`, which is allowed to set roles):
   ```sql
   update public.profiles
      set role = 'admin', status = 'active', member_since = current_date
    where email = 'president@example.org';
   ```
3. Sign in at `https://portal.r3riders.org/login`, open **Admin > Members** and invite the other officers. Role changes after this point are done in the portal and recorded in the audit log.

## 5. Email (Resend)

1. Create a Resend account, add and verify the sending domain (SPF/DKIM DNS records).
2. Set `RESEND_API_KEY` and `EMAIL_FROM="R3 Riders <no-reply@r3riders.org>"`.
3. Without `RESEND_API_KEY` the app logs and skips transactional emails (applications, orders, donations, dues). Auth emails come from Supabase (section 1).

## 6. Fill in the content (as admin)

**Admin > Site content & settings**: payment instructions (GCash number/name, bank), contact details, officers, registration details, membership stats, "how funds are used".
**Admin > Sponsors & partners**: sponsor names, logos and website links shown on Home.
**Admin > Membership types**: create Riding Member, Associate/Supporter and Volunteer with fees, requirements and benefits (the Membership page is empty until you do).
From the officer menu add programs, events, shop products (with photos and stock), dues periods, campaigns and documents.

Review the draft legal pages (`src/lib/legal-content.ts`) with the organization before launch. They are clearly marked as drafts on the site.

## 7. Payment gateway (PayMongo), optional

Manual verification (GCash/bank + officer check) is the default and needs no keys. To enable PayMongo later:
1. Create a PayMongo account, get **test** keys first.
2. Set `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMENT_PROVIDER=paymongo`, redeploy.
3. In PayMongo > Developers > Webhooks add `https://www.r3riders.org/api/webhooks/paymongo` for the `checkout_session.payment.paid` event and copy the signing secret into `PAYMONGO_WEBHOOK_SECRET`.
4. Place a test order and donation, confirm they flip to paid and emails send, then switch to live keys.

Order and donation status can only change through an officer action or a signature-verified webhook. Cards are never handled by this app.

## 8. Post-deploy checklist

- [ ] `https://www.r3riders.org` loads the public Home; `https://portal.r3riders.org` redirects to `/login`
- [ ] `www.r3riders.org/login` and `www.r3riders.org/admin` return 404 (portal routes unreachable on the public host); `portal.r3riders.org/shop` redirects to login (public routes unreachable on the portal host)
- [ ] `robots.txt` and `sitemap.xml` load on `www`; portal `robots.txt` disallows everything
- [ ] First admin can sign in; an invited test member receives the invite email, sets a password and lands on the dashboard
- [ ] Submit a test membership application; it appears in **Applications**; approve it and confirm the invite email
- [ ] Place a test order with manual payment; verify it in **Shop**; stock decrements; customer email arrives
- [ ] Submit a test donation; verify it; the campaign progress bar updates only after verification
- [ ] Export donors CSV; confirm an `export_donations` row appears in **Admin > Audit log**
- [ ] Storage buckets `payment-proofs`, `documents`, `member-avatars` are private (open an object URL while signed out: it must fail)
- [ ] Rate limiting: submit the contact form 6 times quickly; the 6th is refused
- [ ] Cron route returns 401 without the secret and `{ expired: n }` with `Authorization: Bearer $CRON_SECRET`
- [ ] Legal drafts reviewed, registered address and contact details filled in, demo placeholders gone
- [ ] Lighthouse on production (mobile) for Home, Shop and Donations; address anything below 90

## 9. Local development with the full stack

```bash
pnpm install
pnpm dlx supabase start          # needs Docker; applies migrations and seed.sql
pnpm dlx supabase status -o env  # copy API_URL / ANON_KEY / SERVICE_ROLE_KEY into .env.local
pnpm db:types                    # regenerate src/lib/supabase/database.types.ts
pnpm dev                         # http://localhost:3000 and http://portal.localhost:3000
```

Dev logins from the seed (password `DevPassw0rd!`): `admin@`, `officer@`, `member@dev.r3riders.test`.

Tests:
- `pnpm test`: unit tests and the RLS/trigger/function suite (runs the real migrations in an in-process Postgres, no Docker)
- `supabase test db`: the same key policies as pgTAP against the real local stack
- `pnpm build && E2E_SUPABASE=1 pnpm test:e2e`: Playwright smoke tests (the Supabase-backed specs need the local stack; without `E2E_SUPABASE=1` they are skipped)
