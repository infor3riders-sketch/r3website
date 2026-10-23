# Assumptions and deviations

Recorded as the build proceeds. Items marked **(security)** override the brief because the brief's own rule is "choose security".

## Environment / tooling
- Next.js is **16.x**, where `middleware.ts` is renamed **`proxy.ts`** (same behavior). The brief's "middleware" is implemented in `src/proxy.ts`.
- Route groups do not appear in URLs, so `(site)/page.tsx` and `(portal)/page.tsx` would both claim `/`. Each group therefore contains a real path segment: `app/(site)/site/*` and `app/(portal)/portal/*`. The proxy rewrites by host and returns 404 for any direct request to `/site` or `/portal`.
- shadcn/ui is not installed via its CLI (interactive, network-dependent). Primitives in `src/components/ui/` are hand-written in the shadcn style (cva + `cn`) and themed to the mockup. Add Radix-based pieces (dialog, dropdown) as needed.
- `Logo` lives in `components/ui` (shared brand) so neither product imports from the other.
- No Docker on the build machine: `supabase start`, `supabase gen types` and the RLS test run could not be executed here. Migrations and tests are written but **unverified against a live database**; run them per `docs/DEPLOY.md`.
- Git was initialised locally (the folder was not a repo); one local commit per phase.

## Design
- `docs/design/home-reference.png` was **not present**, so the Home page follows the written spec and the brief's token values. Compare with `scripts/screenshot.mjs` output in `docs/design/screens/` once the mockup is added, then refine tokens in `src/styles/base.css`.
- No logo or hero photograph was supplied: a placeholder winged "R3" emblem (SVG) and an illustrated sunset-road backdrop are used. Drop files into `public/brand/` (`logo.svg|png`, `hero.jpg`, `icons/{membership,services,merch,donate}.svg`) and they are picked up automatically.
- Card icons are lucide placeholders (ShieldCheck, HeartHandshake, Shirt, HandHeart); lucide has no helmet.
- Events, news and partners on Home use clearly-labelled placeholder data (`src/lib/placeholder-data.ts`) until the DB-backed pages land.
- Contact details in `src/lib/org.ts` are placeholders.

## Contrast (WCAG AA)
- Black on gold `#F2A81D` and white on royal blue `#1F4FB5` (about 7.4:1) and muted `#B8B8B8` on `#151515` all exceed 4.5:1.

## Organization name and registration
- Legal name is **"R3 Riders Organization Incorporated"**, taken from the SEC Certificate of Incorporation supplied by the club (Company Reg. No. 2026100273107-46, issued 21 October 2026, non-stock corporation, Revised Corporation Code RA 11232). It supersedes the brief's "R3 Riders Incorporated" and is used in the footer, metadata, emails and legal pages via `src/lib/org.ts`. The supplied About copy abbreviates it as "R3 Riders Organization, Inc." and is kept verbatim.
- Only the registration facts are published (About > Registration). The certificate image and its QR code are not reproduced on the site.
- The certificate does not authorize soliciting investments or issuing securities. Membership fees and donations on the site are not investments; the donation page keeps "acknowledgement" wording unless official receipts are enabled (see Donation Policy draft).
- The registered address is not on the certificate (the printed address is the SEC office) so it remains a placeholder. Tagline "Ride with a Cause, Serving with Purpose" (About) and "Ride. Connect. Support." (brief) coexist; please confirm.
- About copy lives in `src/lib/about-content.ts`; registration, story, code of conduct, officers and chapters are admin-editable `site_settings` rows (defaults in `src/lib/site-defaults.ts`).

## Membership stats
- Per-area member counts (Iloilo City 20, Cabatuan 30, Sta. Barbara 15, total 65) were provided by the club as examples and are used as defaults. They are a **declared figure** stored in the public `site_settings` key `membership_stats` (admin-editable in the Admin phase), not computed from profiles, because not every rider has a portal account. **Please confirm the real numbers before launch.**

## Build and verification notes
- **Local database verification** uses PGlite (in-process Postgres) with minimal stubs of Supabase's `auth` and `storage` schemas, running the real migrations and seed. It proves the policies, triggers and functions behave as intended. It does not replace one run of `supabase start` + `supabase test db` + `E2E_SUPABASE=1 pnpm test:e2e` against the real stack (Docker was unavailable here); the seeded dev logins, GoTrue behaviour, Storage policies and the Supabase-backed Playwright specs are **written but not yet executed**. CI (`.github/workflows/ci.yml`) is set up to run them.
- `src/lib/supabase/database.types.ts` is hand-maintained in the shape the CLI emits; regenerate with `pnpm db:types` against a live stack.
- **Lighthouse (production build, Home, run on the build machine):** Accessibility 100, Best Practices 100, SEO 100 on both desktop and mobile; CLS 0. **Performance was 56 (desktop) and 39 (mobile)**, below the brief's 90 target, but this machine's Lighthouse CPU benchmark index is about 211 (reference hardware is roughly 1000) and Lighthouse applies a further 4x throttle, so total blocking time (hydration of the React/Next runtime) is badly inflated and the result is not representative. Page weight is small (about 340 KB) and Home is mostly static server HTML with a small client bundle (nav and cart). Changes made from the first run: grain texture changed from an SVG filter to a 3.5 KB PNG, removed backdrop blur, added favicon, descriptive link text. **Re-measure on Vercel / PageSpeed Insights before launch and treat 90+ as unverified until then.** `scripts/` and `docs/perf/` hold no data needed to reproduce: run `npx lighthouse http://localhost:3000 --preset=desktop` against `pnpm start`.
- **Accessibility:** axe (WCAG 2.0/2.1 A and AA) passes on 12 public and portal-login pages. Manual keyboard and screen-reader testing is still recommended.
- Public pages are ISR-cached for 2-5 minutes. Admin content edits call `revalidatePath` for the affected pages, so changes normally appear immediately.
- The public volunteer sign-up and event-interest forms store rows but do not send emails yet; member volunteer sign-ups do send a confirmation.
- Discount codes count a "use" when an order is marked paid, so a code with a use limit can be briefly over-redeemed by orders placed before payment verification.
- Guest order links are derived with HMAC (`ORDER_TOKEN_SECRET`, required in production), so status emails can always rebuild the link; the database stores only a SHA-256 of the token.
- The ride waiver is a checkbox acknowledgement stored on the RSVP (timestamp), not a signed document.
- Roles: `member`, `officer`, `admin`. Officers manage events, programs, applications, shop, donations, dues and documents; admins additionally manage members/roles, membership types, site content, news, gallery and read the audit log.

## Left for v2
- Live PayMongo rollout (adapter, webhook route and tests exist; needs real keys and a test pass)
- Recurring donations
- Member-tier shop pricing (v1 has discount codes only)
- Official donation receipts (PDF) once the club confirms accreditation; the toggle and acknowledgement wording exist
- Ride tracking, mobile app, push notifications
- Automated data-retention clean-up jobs (see `docs/PRIVACY-NOTES.md`)
- Email for public volunteer/event-interest forms and officer notification emails
- Bulk actions, richer reporting and charts for officers
