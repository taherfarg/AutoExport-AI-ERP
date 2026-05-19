# Phase 6 Finance Lite Implementation Plan

**Goal:** Build Finance Lite for vehicle trading with expenses, receivables, payables, profit snapshots, branch profit, and salesperson commissions.

**Architecture:** Supabase/Postgres owns finance records and RLS. Next.js server actions validate mutations with Zod. Finance queries aggregate sales, payments, expenses, shipment costs, and commissions for dashboard views.

---

### Task 1: Database And Permissions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_6_finance_lite.sql`
- Create: `supabase/tests/phase_6_finance_lite.sql`
- Modify: `lib/permissions/permissions.ts`

- [x] Add finance enums for expense category, receivable/payable status, commission status, account status, and snapshot period.
- [x] Add `manage_finance` and `manage_commissions` permissions.
- [x] Create payment methods, bank accounts, cash accounts, expenses, receivables, payables, vehicle profit snapshots, branch profit snapshots, and salesperson commissions.
- [x] Add indexes, grants, updated-at triggers, and RLS policies.
- [x] Seed finance records for existing development companies.
- [x] Add pgTAP tests for RLS isolation and finance rollups.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/finance/calculations.ts`
- Create: `lib/finance/format.ts`
- Create: `lib/validations/finance.ts`
- Create: `components/finance/finance-status-badge.tsx`
- Create: `tests/unit/finance.test.ts`

- [x] Write failing tests for vehicle profit, finance summary, receivable status, payable status, and commission calculations.
- [x] Implement calculation and formatting helpers.
- [x] Add Zod schemas for expenses, receivables, payables, profit snapshots, and commissions.
- [x] Add finance status badge component.

### Task 3: Queries And Actions

**Files:**
- Create: `features/finance/queries.ts`
- Create: `features/finance/actions.ts`

- [x] Add finance permission helper.
- [x] Add dashboard queries for invoices, payments, expenses, receivables, payables, commissions, and branch snapshots.
- [x] Add actions to create expenses, payables, and commissions.
- [x] Revalidate finance and related vehicle/sales pages after mutations.

### Task 4: UI Routes

**Files:**
- Create: `app/(app)/finance/page.tsx`

- [x] Build Finance Lite dashboard KPIs.
- [x] Build vehicle profit table.
- [x] Build receivables and payables tables.
- [x] Build expense and commission forms.
- [x] Add branch profit summary.
- [x] Keep controls permission-aware.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-6-finance-lite.md`

- [x] Extend E2E to create an expense and commission and verify finance dashboard.
- [x] Document Phase 6 behavior and security notes.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Run `npx supabase db reset`.
- [x] Run `npx supabase test db`.
- [x] Run `npm run test:e2e`.
- [ ] Commit implementation.
