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
