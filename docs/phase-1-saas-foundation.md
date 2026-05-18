# Phase 1 SaaS Foundation

Phase 1 establishes the production foundation for AutoSphere ERP.

## Implemented

- Next.js App Router foundation
- Supabase local configuration
- Core SaaS schema
- RLS helper functions
- RLS policies
- Package and module seed data
- Auth pages
- Company onboarding
- Dashboard shell
- Branch settings foundation
- User, role, subscription, and company settings foundation
- Unit, SQL, and E2E smoke tests

## Verification

Run:

```powershell
npm run lint
npm run test
npm run test:e2e
npx supabase db reset
npx supabase test db
```

## Security Notes

- RLS is enabled for all Phase 1 public tables.
- Authorization data is stored in database tables.
- User-editable metadata is not used for permissions.
- Service-role keys are isolated to server-only code.
- Branch-scoped records enforce branch/company consistency.
- Tenant isolation is covered by a SQL test that proves one company member cannot see another company's row.
