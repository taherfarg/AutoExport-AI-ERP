# Phase 7 Documents And Signature Design

## Scope

Phase 7 builds the general document management and internal digital signature foundation for AutoSphere ERP. Existing vehicle and export document records remain valid, but this phase adds a central document archive that can link files to vehicles, customers, sales documents, export/import orders, and company workflows.

## Production Outcomes

- Secure document archive backed by Supabase Storage.
- Document metadata in a central `documents` table.
- Flexible `document_links` for linking one file to one or more business records.
- Document checklist templates and checklist records for vehicles, customers, exports, invoices, and internal workflows.
- Verification workflow for uploaded documents.
- Internal digital signature request workflow with signature image storage metadata.
- Signed document archive linked to customers, vehicles, orders, invoices, or generic documents.
- Permission-aware UI and RLS using document permissions.

## Database Design

New tables:

- `documents`: central metadata for uploaded or generated files.
- `document_links`: polymorphic links from documents to business entities.
- `document_templates`: reusable document template metadata.
- `document_checklists`: generic checklist items and their completion state.
- `document_verifications`: verification history for documents.
- `signature_requests`: internal signature workflow.
- `signed_documents`: final signed document archive.

New enums:

- `document_category`
- `document_status`
- `document_link_entity`
- `document_verification_status`
- `signature_request_status`

## Storage

Use a private Supabase Storage bucket named `documents`.

Storage paths use:

```text
{company_id}/documents/{timestamp}-{safe_file_name}
{company_id}/signatures/{signature_request_id}/{timestamp}-{safe_file_name}
```

Storage policies must check the first path segment as `company_id` and require active company membership for reads and `upload_documents` for writes.

## Permissions

Use existing permissions:

- `upload_documents`
- `verify_documents`

Add:

- `view_documents`
- `manage_signature_requests`

Company owners receive the new permissions automatically. Uploading documents requires `upload_documents`; verification requires `verify_documents`; signature creation and status updates require `manage_signature_requests`.

## UI

Route: `/documents`

Sections:

- KPI cards for total documents, uploaded, verified, expired, pending signatures, and signed documents.
- Document archive table.
- Upload document form.
- Link document form fields inside upload flow.
- Verification action.
- Signature request form.
- Signature request table.
- Signed document archive table.

The first implementation uses internal signature capture records with uploaded signature image and signed document files. Provider integrations remain later.

## Tests

- pgTAP proves table RLS, storage bucket, permissions, and tenant isolation.
- Vitest covers checklist completion, signature status labels, expiry detection, and validation.
- Playwright extends the existing workspace flow to upload a private document file, verify it, create a signature request, upload signature/signed files, and mark it signed.

## Non-Goals

- No external signature provider integration yet.
- No PDF rendering/generation engine yet.
- No OCR or AI extraction until the AI phase.
- No full document versioning beyond the signed archive and verification history.
