# Phase 2B Vehicle Documents and Photos Design

Date: 2026-05-19
Status: Approved by continuation
Product: AutoSphere ERP

## Goal

Add secure, production-shaped vehicle photo and document management to the existing inventory module.

## Scope

Phase 2B includes:

- A private Supabase Storage bucket for vehicle media.
- Storage RLS policies that isolate files by company folder.
- Vehicle document checklist template rows for common showroom and export documents.
- Upload-ready metadata actions for vehicle photos and documents.
- Signed URL preview links for private files.
- Vehicle detail sections for photo gallery, document checklist, and document upload metadata.
- Status recalculation for `photos_status` and `documents_status`.
- SQL tests for storage bucket existence, RLS coverage, checklist seed data, and company path isolation.
- E2E coverage that creates a vehicle and adds a document metadata row.

Binary file bytes are supported through Supabase Storage when a browser file is provided. The UI also supports metadata-only document checklist rows so the workflow remains testable and useful before provider-specific document extraction is added.

## Security

The `vehicle-media` bucket is private. Paths are scoped as:

```text
<company_id>/vehicles/<vehicle_id>/photos/<filename>
<company_id>/vehicles/<vehicle_id>/documents/<filename>
```

Storage policies only allow authenticated users with matching company membership and vehicle permissions to access objects under their own company folder. Server actions verify that the target vehicle belongs to the signed-in workspace before inserting metadata.

## UI

The vehicle detail page gains:

- Photo gallery with primary photo marker and private signed preview links.
- Document checklist with required/export-required flags, status, expiry date, and verification state.
- Add photo metadata/upload form.
- Add document metadata/upload form.
- Compact readiness summary using existing cards.

## Verification

Required commands:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```

