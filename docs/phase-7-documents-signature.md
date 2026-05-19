# Phase 7 Documents And Signature

Phase 7 adds central document management and internal digital signature workflows for AutoSphere ERP.

## Planned

- Central document archive.
- Secure Supabase Storage bucket.
- Document links to vehicles, customers, sales, export/import, and company records.
- Generic document checklists.
- Document verification workflow.
- Document templates.
- Internal signature requests.
- Signed document archive.
- Permission-aware RLS.

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
