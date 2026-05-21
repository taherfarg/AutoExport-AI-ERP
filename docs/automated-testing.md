# Automated Testing

AutoSphere ERP has a single local QA gate for release confidence:

```powershell
npm run qa:full
```

The command runs:

1. ESLint
2. Vitest unit tests
3. TypeScript compile check
4. Next.js production build
5. Supabase database reset
6. Supabase pgTAP database/RLS tests
7. Playwright end-to-end workflow

Reports are written to `qa-reports/<timestamp>/report.md`, with a rolling copy at `qa-reports/latest.md`.

## Faster Local Runs

When the local database is already reset and seeded:

```powershell
npm run qa:full:keepdb
```

This skips `npx supabase db reset` but still runs pgTAP and E2E.

## Requirements

- Docker Desktop running
- Local Supabase CLI available through `npx supabase`
- `.env.local` configured from `.env.example`
- Port `3000` available for the production Next.js server

## What The Gate Proves

- App code follows lint rules.
- Business logic tests pass.
- TypeScript contracts compile.
- The production build succeeds.
- All migrations apply from an empty database.
- RLS and database behavior pass pgTAP tests.
- The browser can complete the primary SaaS/DMS workflow across auth, workspace setup, branches, inventory, CRM, sales, documents, marketing, AI, reports, alerts, chat, billing, service, parts, and automation.

## Interpreting Failures

Open `qa-reports/latest.md`, then inspect the failed step log listed in the table. Fix the first failed step before rerunning the full gate.

For UI failures, Playwright also writes artifacts under `test-results/`.
