# Phase 16 F&I Deal Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AutoSphere ERP's production F&I / Deal Desk layer for deal structuring, lender submissions, insurance/warranty products, and approvals.

**Architecture:** Use a new `deal_desk` module gated by package access and sales permissions. Store all F&I records in tenant-scoped Supabase tables with RLS, and keep lender/provider integrations architecture-ready while local workflows save real records. Business calculations live in reusable TypeScript helpers and are covered by unit tests.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL/RLS, Server Actions, Tailwind/shadcn-style UI, Vitest, Playwright, pgTAP.

---

## Tasks

### Task 1: Documentation Checkpoint

**Files:**
- Create: `docs/superpowers/specs/2026-05-20-phase-16-fi-deal-desk-design.md`
- Create: `docs/superpowers/plans/2026-05-20-phase-16-fi-deal-desk.md`

- [ ] Write the design spec.
- [ ] Write this implementation plan.
- [ ] Commit with `docs: plan phase 16 fi deal desk`.

### Task 2: Database Schema and RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_16_fi_deal_desk.sql`
- Create: `supabase/tests/phase_16_fi_deal_desk.sql`

- [ ] Create F&I enums for deal type/status, application status, lender submission status, product status, and approval status.
- [ ] Add `deal_desk` module and package access for Showroom Pro, Export Business, and Enterprise.
- [ ] Add `view_deals`, `manage_deals`, and `approve_deals`.
- [ ] Create `lenders`, `insurance_products`, `warranty_products`, `deals`, `deal_products`, `finance_applications`, `lender_submissions`, and `deal_approvals`.
- [ ] Add tenant/branch foreign keys and indexes.
- [ ] Enable RLS and policies.
- [ ] Add pgTAP coverage for RLS, permission seed, tenant isolation, and deal creation.

### Task 3: Domain Logic

**Files:**
- Create: `lib/deals/calculations.ts`
- Create: `lib/validations/deals.ts`
- Test: `tests/unit/deals.test.ts`

- [ ] Add amortized monthly payment calculation.
- [ ] Add finance amount and F&I gross calculations.
- [ ] Add Zod validation schemas for deal, lender, products, finance application, submission, and approval actions.
- [ ] Add unit tests for zero-interest, financed interest, product gross, and finance amount edge cases.

### Task 4: Backend Actions and Queries

**Files:**
- Create: `features/deals/queries.ts`
- Create: `features/deals/actions.ts`

- [ ] Query deals with related vehicle, customer/lead, quotation, and lender data.
- [ ] Query setup options: branches, quotations, lenders, products.
- [ ] Create lenders, insurance products, warranty products, deals, applications, submissions, and approvals.
- [ ] Add audit logs for sensitive deal, submission, and approval actions.

### Task 5: UI

**Files:**
- Create: `app/(app)/sales/deals/page.tsx`
- Create: `app/(app)/sales/deals/deal-action-forms.tsx`
- Modify: `lib/modules/module-registry.ts`

- [ ] Add sidebar entry for Deal Desk gated by `deal_desk`.
- [ ] Build Deal Desk dashboard with KPIs, deals table, create deal form, lender form, product forms, submission form, and approval form.
- [ ] Use client-enhanced forms for visible success/error feedback.

### Task 6: Verification and Docs

**Files:**
- Modify: `README.md`
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `lib/permissions/permissions.ts`

- [ ] Update README for Phase 16.
- [ ] Extend E2E to create a deal, lender, product, finance application/submission, and approval.
- [ ] Run full verification.
- [ ] Commit with `feat: add fi deal desk phase`.
