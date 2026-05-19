# Phase 7 Documents And Signature Implementation Plan

**Goal:** Build central document management, secure storage metadata, document checklists, verification workflow, and internal digital signature workflow.

**Architecture:** Supabase/Postgres/RLS owns document metadata, links, checklist status, verification, and signatures. Supabase Storage stores files in a private bucket. Next.js server actions validate mutations with Zod and enforce document permissions.

---

### Task 1: Database, Storage, And Permissions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_7_documents_signature.sql`
- Create: `supabase/tests/phase_7_documents_signature.sql`
- Modify: `lib/permissions/permissions.ts`

- [ ] Add document/signature enums.
- [ ] Add `view_documents` and `manage_signature_requests` permissions.
- [ ] Create documents, document links, templates, checklists, verifications, signature requests, and signed documents.
- [ ] Add private `documents` storage bucket and storage policies.
- [ ] Add indexes, grants, triggers, and RLS policies.
- [ ] Seed document templates/checklists/signature examples.
- [ ] Add pgTAP tests for RLS, storage policy, and tenant isolation.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/documents/calculations.ts`
- Create: `lib/documents/format.ts`
- Create: `lib/validations/documents.ts`
- Create: `components/documents/document-status-badge.tsx`
- Create: `tests/unit/documents.test.ts`

- [ ] Write failing tests for checklist completion, expiry status, signature status labels, and validation.
- [ ] Implement document calculation and formatting helpers.
- [ ] Add Zod schemas for document upload metadata, document verification, signature request, and signing.
- [ ] Add document status badge.

### Task 3: Queries And Actions

**Files:**
- Create: `features/documents/queries.ts`
- Create: `features/documents/actions.ts`

- [ ] Add document permission helper.
- [ ] Add queries for document archive, checklists, verifications, signature requests, and signed documents.
- [ ] Add actions to upload/create document metadata, verify document, create signature request, and mark signed.
- [ ] Revalidate document pages after mutations.

### Task 4: UI Route

**Files:**
- Create: `app/(app)/documents/page.tsx`

- [ ] Build document dashboard KPIs.
- [ ] Build document archive table.
- [ ] Build upload metadata/form workflow.
- [ ] Build verification action.
- [ ] Build signature request form and signed archive.
- [ ] Keep controls permission-aware.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-7-documents-signature.md`

- [ ] Extend E2E to create a document, verify it, create a signature request, and mark signed.
- [ ] Document Phase 7 behavior and security notes.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.
