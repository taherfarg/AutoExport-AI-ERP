# Phase 4 Sales Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production sales transaction core for quotations, reservations, proformas, sales invoices, and payments.

**Architecture:** Sales records sit between CRM and inventory. Supabase RLS protects each tenant and branch, database triggers enforce financial totals and key status transitions, and Next.js server actions use the authenticated Supabase client so policies are exercised in normal app flows.

**Tech Stack:** Supabase/Postgres/RLS, Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Zod, Vitest, pgTAP, Playwright.

---

### Task 1: Database And Permissions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_4_sales_transactions.sql`
- Create: `supabase/tests/phase_4_sales_transactions.sql`
- Modify: `lib/permissions/permissions.ts`

- [ ] Add sales enums for quotation, reservation, proforma, invoice, payment, signature, and payment method statuses.
- [ ] Create `quotations`, `quotation_items`, `reservations`, `proforma_invoices`, `proforma_invoice_items`, `sales_invoices`, `sales_invoice_items`, and `payments`.
- [ ] Add calculation functions and triggers for document totals, invoice paid amount, balance due, and vehicle status updates.
- [ ] Add `view_sales`, `update_quotation`, and `view_payments` permissions.
- [ ] Enable RLS and explicit authenticated grants for all sales tables.
- [ ] Add sales seed data linked to Phase 2 vehicles and Phase 3 customers/leads.
- [ ] Add pgTAP tests for RLS, reservation rules, and payment balance updates.

### Task 2: Sales Domain Code

**Files:**
- Create: `lib/sales/calculations.ts`
- Create: `lib/sales/format.ts`
- Create: `lib/validations/sales.ts`
- Create: `components/sales/sales-status-badge.tsx`
- Create: `tests/unit/sales.test.ts`

- [ ] Write failing unit tests for quotation totals and invoice payment status.
- [ ] Implement sales calculation helpers.
- [ ] Implement sales formatting helpers and status badge component.
- [ ] Add Zod schemas for create quotation, create reservation, create proforma, create invoice, and record payment.

### Task 3: Sales Queries And Actions

**Files:**
- Create: `features/sales/queries.ts`
- Create: `features/sales/actions.ts`

- [ ] Add permission helpers for sales workflows.
- [ ] Add queries for sales desk KPIs, quotations, quotation detail, related reservations, proformas, invoices, and payments.
- [ ] Add server actions for quotation creation, reservation creation, proforma creation, invoice creation, and payment recording.
- [ ] Ensure server actions validate workspace/company ownership and rely on RLS for writes.

### Task 4: Sales UI

**Files:**
- Create: `app/(app)/sales/quotations/page.tsx`
- Create: `app/(app)/sales/quotations/[quotationId]/page.tsx`
- Create: `app/(app)/sales/invoices/page.tsx`

- [ ] Build sales quotations desk with KPIs, filters, quotation list, and add-quotation form.
- [ ] Build quotation detail page with document preview and workflow actions.
- [ ] Build invoices/payment monitoring page.
- [ ] Add empty states and permission-aware action visibility.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-4-sales-transactions.md`

- [ ] Extend E2E to create a quotation, reserve vehicle, create invoice, and record payment.
- [ ] Document implemented Phase 4 behavior and security notes.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit docs and implementation.

