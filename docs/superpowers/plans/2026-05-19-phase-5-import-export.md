# Phase 5 Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production import/export operations core with export orders, shipping tracking, customs clearance, export documents, logistics partners, and shipment costs.

**Architecture:** Import/export records sit after sales and inventory. Supabase RLS protects company/branch data, database constraints keep export records tenant-consistent, and Next.js server actions use authenticated Supabase clients so RLS is exercised in normal app flows.

**Tech Stack:** Supabase/Postgres/RLS, Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Zod, Vitest, pgTAP, Playwright.

---

### Task 1: Database And Permissions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_5_import_export.sql`
- Create: `supabase/tests/phase_5_import_export.sql`
- Modify: `lib/permissions/permissions.ts`

- [ ] Add import/export enums for shipping, customs, document, partner, transport, and order statuses.
- [ ] Create destination countries, logistics partners, export orders, import orders, shipping events, customs clearance, export documents, and shipment costs.
- [ ] Add `view_exports`, `update_export_status`, and `manage_logistics_partners` permissions.
- [ ] Enable RLS and explicit authenticated grants for all new public tables.
- [ ] Seed destination countries, logistics partners, and export orders for GCC/global markets.
- [ ] Add pgTAP tests for RLS and export workflow calculations.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/export/format.ts`
- Create: `lib/export/calculations.ts`
- Create: `lib/validations/export.ts`
- Create: `components/export/export-status-badge.tsx`
- Create: `tests/unit/export.test.ts`

- [ ] Write failing unit tests for export status formatting, delayed shipment detection, document readiness, and cost totals.
- [ ] Implement formatting and calculation helpers.
- [ ] Add Zod schemas for export order creation, shipping event creation, customs update, export document creation, and shipment cost creation.
- [ ] Add export status badge component.

### Task 3: Queries And Actions

**Files:**
- Create: `features/export/queries.ts`
- Create: `features/export/actions.ts`

- [ ] Add permission helpers for export operations.
- [ ] Add query functions for export order lists, detail records, shipping events, customs clearance, export documents, shipment costs, destination countries, and logistics partners.
- [ ] Add server actions to create export orders, add shipping events, upsert customs clearance, add export documents, and add shipment costs.
- [ ] Revalidate export pages after mutations.

### Task 4: UI Routes

**Files:**
- Create: `app/(app)/export/orders/page.tsx`
- Create: `app/(app)/export/orders/[exportOrderId]/page.tsx`

- [ ] Build export orders dashboard with KPIs, filters, table, and create-export-order form.
- [ ] Build export order detail page with overview cards, shipping timeline, customs panel, document checklist, shipment cost ledger, and action forms.
- [ ] Add empty states and permission-aware controls.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-5-import-export.md`

- [ ] Extend E2E to create an export order, add shipping event, update customs, add export document, and add shipment cost.
- [ ] Document Phase 5 behavior and security notes.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.

