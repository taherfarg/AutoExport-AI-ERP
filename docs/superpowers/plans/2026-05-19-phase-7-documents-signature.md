# Phase 7 Documents And Signature Implementation Plan

**Goal:** Build central document management, secure storage metadata, document checklists, verification workflow, and internal digital signature workflow.

**Architecture:** Supabase/Postgres/RLS owns document metadata, links, checklist status, verification, and signatures. Supabase Storage stores files in a private bucket. Next.js server actions validate mutations with Zod and enforce document permissions.

---

### Task 1: Database, Storage, And Permissions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_7_documents_signature.sql`
- Create: `supabase/tests/phase_7_documents_signature.sql`
- Modify: `lib/permissions/permissions.ts`

- [x] Add document/signature enums.
- [x] Add `view_documents` and `manage_signature_requests` permissions.
- [x] Create documents, document links, templates, checklists, verifications, signature requests, and signed documents.
- [x] Add private `documents` storage bucket and storage policies.
- [x] Add indexes, grants, triggers, and RLS policies.
- [x] Seed document templates/checklists/signature examples.
- [x] Add pgTAP tests for RLS, storage policy, and tenant isolation.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/documents/calculations.ts`
- Create: `lib/documents/format.ts`
- Create: `lib/validations/documents.ts`
- Create: `components/documents/document-status-badge.tsx`
- Create: `tests/unit/documents.test.ts`

- [x] Write failing tests for checklist completion, expiry status, signature status labels, and validation.
- [x] Implement document calculation and formatting helpers.
- [x] Add Zod schemas for document upload metadata, document verification, signature request, and signing.
- [x] Add document status badge.

### Task 3: Queries And Actions

**Files:**
- Create: `features/documents/queries.ts`
- Create: `features/documents/actions.ts`

- [x] Add document permission helper.
- [x] Add queries for document archive, checklists, verifications, signature requests, and signed documents.
- [x] Add actions to upload/create document metadata, verify document, create signature request, and mark signed.
- [x] Revalidate document pages after mutations.

### Task 4: UI Route

**Files:**
- Create: `app/(app)/documents/page.tsx`

- [x] Build document dashboard KPIs.
- [x] Build document archive table.
- [x] Build upload metadata/form workflow.
- [x] Build verification action.
- [x] Build signature request form and signed archive.
- [x] Keep controls permission-aware.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-7-documents-signature.md`

- [x] Extend E2E to create a document, verify it, create a signature request, and mark signed.
- [x] Document Phase 7 behavior and security notes.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Run `npx supabase db reset`.
- [x] Run `npx supabase test db`.
- [x] Run `npm run test:e2e`.
- [ ] Commit implementation.
