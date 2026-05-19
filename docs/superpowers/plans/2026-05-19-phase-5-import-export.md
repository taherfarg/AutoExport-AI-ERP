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

- [x] Add import/export enums for shipping, customs, document, partner, transport, and order statuses.
- [x] Create destination countries, logistics partners, export orders, import orders, shipping events, customs clearance, export documents, and shipment costs.
- [x] Add `view_exports`, `update_export_status`, and `manage_logistics_partners` permissions.
- [x] Enable RLS and explicit authenticated grants for all new public tables.
- [x] Seed destination countries, logistics partners, and export orders for GCC/global markets.
- [x] Add pgTAP tests for RLS and export workflow calculations.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/export/format.ts`
- Create: `lib/export/calculations.ts`
- Create: `lib/validations/export.ts`
- Create: `components/export/export-status-badge.tsx`
- Create: `tests/unit/export.test.ts`

- [x] Write failing unit tests for export status formatting, delayed shipment detection, document readiness, and cost totals.
- [x] Implement formatting and calculation helpers.
- [x] Add Zod schemas for export order creation, import order creation, shipping event creation, customs update, export document creation, and shipment cost creation.
- [x] Add export status badge component.

### Task 3: Queries And Actions

**Files:**
- Create: `features/export/queries.ts`
- Create: `features/export/actions.ts`

- [x] Add permission helpers for export operations.
- [x] Add query functions for export/import order lists, detail records, shipping events, customs clearance, export documents, shipment costs, destination countries, and logistics partners.
- [x] Add server actions to create export orders, create import orders, add shipping events, upsert customs clearance, add export documents, and add shipment costs.
- [x] Revalidate export pages after mutations.

### Task 4: UI Routes

**Files:**
- Create: `app/(app)/export/orders/page.tsx`
- Create: `app/(app)/export/orders/[exportOrderId]/page.tsx`

- [x] Build export orders dashboard with KPIs, filters, table, and create-export-order form.
- [x] Build export order detail page with overview cards, shipping timeline, customs panel, document checklist, shipment cost ledger, and action forms.
- [x] Add empty states and permission-aware controls.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-5-import-export.md`

- [x] Extend E2E to create an export order, add shipping event, update customs, add export document, and add shipment cost.
- [x] Document Phase 5 behavior and security notes.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Run `npx supabase db reset`.
- [x] Run `npx supabase test db`.
- [x] Run `npm run test:e2e`.
- [ ] Commit implementation.
