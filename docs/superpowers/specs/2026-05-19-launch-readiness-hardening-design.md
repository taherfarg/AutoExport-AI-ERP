# Launch Readiness Hardening Design

This phase prepares AutoSphere ERP for staging and production deployment after the 10-phase product foundation. It does not add new dealership modules. It adds guardrails that make deployment failures, security regressions, and missing configuration easier to catch before a real dealer uses the system.

## Scope

- Central environment validation for required public and server-only variables.
- Health/readiness endpoint for deployment smoke checks.
- Database security pgTAP audit that fails if any exposed public table lacks RLS.
- Regression checks that protected app routes redirect unauthenticated visitors.
- Deployment and launch checklist documentation.

## Environment Rules

- Required server runtime variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
- Optional server-only AI variables:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- Server-only secrets must not use a `NEXT_PUBLIC_` prefix.
- Public values must be safe to expose to browsers.

## Health Endpoint

Route: `/api/health`

The endpoint returns JSON with:

- `status`
- `environment`
- `supabaseUrlConfigured`
- `serviceRoleConfigured`
- `appUrlConfigured`
- `timestamp`

It does not expose secret values and does not perform expensive database work. It is meant for deployment smoke checks and uptime probes.

## Database Security Audit

Add a pgTAP test that checks:

- Every public table has RLS enabled.
- Public tables granted to `authenticated` are covered by RLS.
- Sensitive schemas and app-private functions are not executable by `anon`.

This complements table-specific phase tests by catching future migration mistakes.

## E2E Route Smoke

Add an unauthenticated route smoke test for protected routes:

- `/dashboard`
- `/vehicles`
- `/crm/leads`
- `/sales/quotations`
- `/documents`
- `/ai`
- `/reports`
- `/operations/alerts`
- `/chat`
- `/settings/audit-logs`

Each route should redirect to `/login` rather than rendering protected data.

## Documentation

Add a launch checklist covering:

- Environment variables.
- Supabase staging setup.
- Migration/reset/test commands.
- Vercel deployment checks.
- Security review checklist.
- Provider integration readiness.

## Success Criteria

- Full verification passes.
- Health endpoint test proves no secrets are leaked.
- pgTAP security audit passes on a fresh local reset.
- Protected routes redirect when unauthenticated.
- Launch checklist is committed with exact commands.
