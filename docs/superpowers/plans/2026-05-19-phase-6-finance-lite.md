# Phase 6 Finance Lite Implementation Plan

**Goal:** Build Finance Lite for vehicle trading with expenses, receivables, payables, profit snapshots, branch profit, and salesperson commissions.

**Architecture:** Supabase/Postgres owns finance records and RLS. Next.js server actions validate mutations with Zod. Finance queries aggregate sales, payments, expenses, shipment costs, and commissions for dashboard views.

---

### Task 1: Database And Permissions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_6_finance_lite.sql`
- Create: `supabase/tests/phase_6_finance_lite.sql`
- Modify: `lib/permissions/permissions.ts`

- [ ] Add finance enums for expense category, receivable/payable status, commission status, account status, and snapshot period.
- [ ] Add `manage_finance` and `manage_commissions` permissions.
- [ ] Create payment methods, bank accounts, cash accounts, expenses, receivables, payables, vehicle profit snapshots, branch profit snapshots, and salesperson commissions.
- [ ] Add indexes, grants, updated-at triggers, and RLS policies.
- [ ] Seed finance records for existing development companies.
- [ ] Add pgTAP tests for RLS isolation and finance rollups.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/finance/calculations.ts`
- Create: `lib/finance/format.ts`
- Create: `lib/validations/finance.ts`
- Create: `components/finance/finance-status-badge.tsx`
- Create: `tests/unit/finance.test.ts`

- [ ] Write failing tests for vehicle profit, finance summary, receivable status, payable status, and commission calculations.
- [ ] Implement calculation and formatting helpers.
- [ ] Add Zod schemas for expenses, receivables, payables, profit snapshots, and commissions.
- [ ] Add finance status badge component.

### Task 3: Queries And Actions

**Files:**
- Create: `features/finance/queries.ts`
- Create: `features/finance/actions.ts`

- [ ] Add finance permission helper.
- [ ] Add dashboard queries for invoices, payments, expenses, receivables, payables, commissions, and branch snapshots.
- [ ] Add actions to create expenses, receivables, payables, profit snapshots, branch snapshots, and commissions.
- [ ] Revalidate finance and related vehicle/sales pages after mutations.

### Task 4: UI Routes

**Files:**
- Create: `app/(app)/finance/page.tsx`

- [ ] Build Finance Lite dashboard KPIs.
- [ ] Build vehicle profit table.
- [ ] Build receivables and payables tables.
- [ ] Build expense and commission forms.
- [ ] Add branch profit summary.
- [ ] Keep controls permission-aware.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-6-finance-lite.md`

- [ ] Extend E2E to create an expense and commission and verify finance dashboard.
- [ ] Document Phase 6 behavior and security notes.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.
