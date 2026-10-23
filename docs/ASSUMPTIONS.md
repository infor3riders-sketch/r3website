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

## Organization name
- The brief says **"R3 Riders Incorporated"**; the About copy supplied later says **"R3 Riders Organization, Inc."** with the motto "Ride with a Cause, Serving with Purpose". The About page uses the supplied copy verbatim; the rest of the site still uses the brief's name and tagline ("Ride. Connect. Support."). **Please confirm the legal name** (it also appears in the footer, metadata, emails and legal pages via `src/lib/org.ts`) and whether both taglines should coexist.
- About copy lives in `src/lib/about-content.ts` and moves to admin-editable DB content in the content phase. Story, code of conduct, officers and SEC details sections are still to come on this page.
