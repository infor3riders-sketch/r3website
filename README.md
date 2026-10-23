# R3 Riders Incorporated: Website + Member Portal

One Next.js app, one Supabase project, one Vercel project, two products selected by hostname:

| Product | Local host | Production (example) | Code |
|---|---|---|---|
| Public website | `localhost:3000` | `www.r3riders.org` | `src/app/(site)/site` |
| Member portal | `portal.localhost:3000` | `portal.r3riders.org` | `src/app/(portal)/portal` |

`src/proxy.ts` rewrites by host. Browsers resolve `*.localhost` to loopback automatically, so no hosts-file edit is needed.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev                     # http://localhost:3000 and http://portal.localhost:3000
```

Scripts: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.

Brand assets are optional files in `public/brand/` (see `docs/ASSUMPTIONS.md`).
Visual check of Home: `node scripts/screenshot.mjs` (server running) writes to `docs/design/screens/`.

## Docs
- `docs/ASSUMPTIONS.md`: assumptions and deviations from the brief
- `docs/DEPLOY.md`, `docs/PRIVACY-NOTES.md`: added in the final phase
