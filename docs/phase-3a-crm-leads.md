# Phase 3A CRM Leads Core

Phase 3A adds the production CRM foundation for AutoSphere ERP.

## Planned

- Customers, leads, messages, follow-ups, opportunities, and customer notes.
- CRM permissions.
- Tenant, branch, and assignment-aware RLS.
- GCC/global CRM seed data.
- Lead list, pipeline, and detail pages.
- Matching available vehicle suggestions.
- Unit, SQL, and E2E tests.

## Verification

Run:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```

