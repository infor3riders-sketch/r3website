# R3 Riders Organization Incorporated: Website + Member Portal

One Next.js app, one Supabase project and one Vercel project, serving two products selected by hostname:

| Product | Local host | Production (example) | Code |
|---|---|---|---|
| Public website | `localhost:3000` | `www.r3riders.org` | `src/app/(site)/site` |
| Member portal (private) | `portal.localhost:3000` | `portal.r3riders.org` | `src/app/(portal)/portal` |

`src/proxy.ts` (Next 16's renamed middleware) rewrites by host. Public routes are unreachable on the portal host and vice versa (404), and the internal `/site` and `/portal` prefixes can never be addressed directly. Browsers resolve `*.localhost` to loopback, so no hosts-file edit is needed.

**Stack:** Next.js 16 (App Router) + TypeScript strict, Tailwind v4 with shadcn-style primitives, Supabase (Postgres, Auth, Storage, RLS) via `@supabase/ssr`, Zod + React Hook Form, Resend email, pnpm, Vercel.

## Quick start

```bash
pnpm install
cp .env.example .env.local     # fill in Supabase keys; hosts default to localhost
pnpm dev                       # public: http://localhost:3000   portal: http://portal.localhost:3000
```

Without Supabase keys the public site still renders (demo content, empty states) and the portal shows a "not configured" notice. For the full stack see `docs/DEPLOY.md` section 9.

| Script | Purpose |
|---|---|
| `pnpm typecheck` / `pnpm lint` | TypeScript (strict) and ESLint |
| `pnpm test` | Vitest: validators, role/pricing/stock logic, emails, **RLS/trigger/function tests that run the real migrations in an in-process Postgres (PGlite), no Docker** |
| `pnpm build && pnpm test:e2e` | Playwright smoke + accessibility tests. Add `E2E_SUPABASE=1` with the local Supabase stack to include the login/RSVP/checkout/application/donation specs |
| `supabase test db` | The key RLS policies as pgTAP against the real local stack |
| `pnpm db:types` | Regenerate `src/lib/supabase/database.types.ts` from a running local stack |
| `node scripts/screenshot.mjs` | Full-page screenshots of Home (desktop/tablet/mobile) into `docs/design/screens/` |

## What is in the box

**Public website:** Home (hero, four feature cards, tagline band, membership stats, events, news, partners), About (vision, mission, goals, values, story, code of conduct, officers, SEC registration), Membership (types and multi-step application), Services (programs, events, volunteer sign-up), Shop (catalogue, cart, checkout, token-protected order page), Donations (presets, campaigns with verified progress, fund usage), Contact, News, Gallery, draft legal pages. SEO: metadata, Open Graph, sitemap, robots, JSON-LD.

**Member portal (invite-only):** dashboard, profile and motorcycles, directory (privacy toggles), announcements with unread tracking, events and rides (list, calendar, RSVP with database-enforced capacity), volunteer programs and slots, dues with proof upload and receipts, documents (role-gated). Officers: application review and approve-and-invite, events and check-in, programs and rosters, shop (orders, products, stock, discount codes), donations (verification, campaigns, audited CSV export), dues, documents, a single payments-to-verify queue. Admins: members and roles, membership types, site content, news, gallery, audit log.

**Payments:** a `PaymentProvider` abstraction. Default **manual** (GCash/bank instructions, reference + proof, officer verifies). A **PayMongo** adapter with signed-webhook verification is included but disabled (`PAYMENT_PROVIDER=paymongo`). Status changes only happen server-side.

## Documentation

- `docs/DEPLOY.md`: Supabase, Vercel, DNS, first admin, email, PayMongo, post-deploy checklist
- `docs/ASSUMPTIONS.md`: assumptions, deviations from the brief and what was not verified
- `docs/PRIVACY-NOTES.md`: Data Privacy Act notes (needs the organization's review)

## Project layout

```
src/app/(site)/site/      public website            src/lib/auth|payments|validators  shared logic
src/app/(portal)/portal/  member portal             src/server/                      actions and queries
src/app/api/              webhook + cron            src/emails/                      email templates
src/components/{ui,site,portal}                     supabase/{migrations,seed.sql,tests,templates}
```

`components/site` and `components/portal` never import each other; shared primitives live in `components/ui`.
