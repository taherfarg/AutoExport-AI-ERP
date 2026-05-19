# Phase 3A CRM Leads Core

Phase 3A adds the production CRM foundation for AutoSphere ERP.

## Implemented

- Customers, leads, messages, follow-ups, opportunities, and customer notes.
- CRM permissions.
- Tenant, branch, and assignment-aware RLS.
- GCC/global CRM seed data.
- Lead list, pipeline, and detail pages.
- Matching available vehicle suggestions.
- Unit, SQL, and E2E tests.

## Security Notes

- Every Phase 3A public CRM table has RLS enabled.
- CRM reads require CRM permissions and company membership.
- Lead visibility is assignment-aware unless the user has all-lead/company management permissions.
- Follow-ups can be read by visible lead users or the assigned follow-up owner.
- Explicit authenticated grants are included for Supabase Data API compatibility.

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
