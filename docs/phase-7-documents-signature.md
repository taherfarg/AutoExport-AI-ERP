# Phase 7 Documents And Signature

Phase 7 adds central document management and internal digital signature workflows for AutoSphere ERP.

## Implemented

- Central document archive backed by the private `documents` Supabase Storage bucket.
- Document metadata in `documents`, with flexible links through `document_links`.
- Generic checklist records in `document_checklists`, updated by verification triggers.
- Document verification history through `document_verifications`.
- Internal signature request workflow in `signature_requests`.
- Signed document archive in `signed_documents`.
- Permission-aware RLS and server-side permission checks.
- `/documents` UI for upload, verification, signature requests, and signed archive review.

## Security Notes

- Files are stored under `{company_id}/...` paths in a private bucket.
- Storage reads require company membership; writes require `upload_documents`.
- Uploads, verification, signature requests, and signing are controlled by server actions.
- Verification and signing create audit log entries.

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
