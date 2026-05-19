# Phase 2B Vehicle Documents and Photos

Phase 2B adds secure media and document checklist workflows to the vehicle inventory module.

## Implemented

- Private Supabase Storage bucket: `vehicle-media`.
- Storage RLS policies for company-folder isolation.
- Vehicle document checklist table with required and export-required flags.
- Checklist seed rows for existing and newly-created vehicles.
- Status refresh helpers for vehicle photo and document readiness.
- Server actions for photo upload and vehicle document metadata/file upload.
- Signed URL generation for private vehicle media.
- Vehicle detail photo section.
- Vehicle detail document checklist and document form.
- SQL tests for storage bucket, RLS policy existence, checklist seeding, and storage path policy structure.
- E2E coverage for adding vehicle document metadata and updating readiness.

## Security Notes

- The storage bucket is private.
- Storage paths start with the company UUID.
- Storage policies check active company membership and `upload_documents`.
- Server actions verify the vehicle belongs to the current workspace before writing metadata or files.
- Signed URLs are short-lived and generated server-side.

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

