# Launch Readiness

AutoSphere ERP now has the full 10-phase product foundation. Use this checklist before staging or production launch.

## Required Environments

Create separate Supabase and Vercel environments for:

- Development
- Staging
- Production

Never share production service-role secrets with local or staging environments.

## Environment Variables

Required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Optional:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Rules:

- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, and webhook secrets must never use `NEXT_PUBLIC_`.
- Browser-safe values may use `NEXT_PUBLIC_`.
- `/api/health` reports configured booleans only and must not expose secret values.

## Supabase Staging Setup

1. Create a staging Supabase project.
2. Copy staging API URL and publishable key into Vercel staging.
3. Copy staging service-role key into Vercel staging as a server-only secret.
4. Run migrations against staging:

```powershell
npx supabase db push
```

For local confidence before pushing:

```powershell
npx supabase db reset
npx supabase test db
```

## Vercel Staging Setup

1. Create a staging deployment using the staging environment variables.
2. Confirm `/api/health` returns `status: "ok"`.
3. Run the browser smoke flow:

```powershell
npm run test:e2e
```

## Security Checklist

- Public tables have RLS enabled.
- `anon` has no direct table privileges on public tables.
- `app_private` routines are not executable by `anon` or `public`.
- Service-role client is used only in server-only code.
- Server actions check permissions before sensitive mutations.
- Audit logs are written for sensitive actions.
- AI actions that can affect business records remain approval-gated.
- Supabase Storage buckets are private unless a public asset bucket is intentionally added.

## Verification Gate

Before merging or deploying:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```

## Provider Integrations

Production provider work can now be added behind the existing module boundaries:

- OpenAI provider call path behind AI server actions.
- Stripe subscriptions behind package/subscription tables.
- Email provider for notifications and reports.
- WhatsApp/Meta provider for customer messaging drafts.
- Shipping/logistics provider sync behind export orders.
- Digital signature provider behind signature requests.

Each provider should get its own migration, server action boundary, audit logs, and tests.
