# Phase 17: Full Accounting Layer Plan

**Architecture:** Supabase/Postgres owns accounting records and posting enforcement. Next.js server actions validate and audit mutations. The UI extends Finance Lite with an accounting dashboard under `/finance/accounting`.

## 1. Documentation

- Create: `docs/superpowers/specs/2026-05-20-phase-17-full-accounting-design.md`
- Create: `docs/superpowers/plans/2026-05-20-phase-17-full-accounting.md`
- Commit docs with `docs: plan phase 17 full accounting`.

## 2. Database and RLS

- Create: `supabase/migrations/<timestamp>_phase_17_full_accounting.sql`
- Create: `supabase/tests/phase_17_full_accounting.sql`

Tasks:

- [ ] Add accounting enums for GL account type/status, journal status/source, period status, bank transaction type, reconciliation status, export format/status, and tax report status.
- [ ] Add accounting permissions: `view_accounting`, `manage_accounting`, `export_accounting`.
- [ ] Add tables: `gl_accounts`, `accounting_periods`, `journal_entries`, `journal_entry_lines`, `tax_rates`, `tax_reports`, `bank_transactions`, `bank_reconciliations`, `accounting_exports`.
- [ ] Add default chart seeding function and company insert trigger.
- [ ] Add balanced journal posting trigger.
- [ ] Add indexes, grants, RLS policies, and updated_at triggers.
- [ ] Add pgTAP tests for RLS isolation, default chart seeding, and posting validation.

## 3. Business Logic and Validation

- Create: `lib/accounting/calculations.ts`
- Create: `lib/accounting/format.ts`
- Create: `lib/validations/accounting.ts`
- Create: `tests/unit/accounting.test.ts`

Tasks:

- [ ] Add journal balance and trial balance helpers.
- [ ] Add tax amount and tax report helpers.
- [ ] Add bank reconciliation difference helper.
- [ ] Add Zod schemas for GL account, journal, tax, bank, reconciliation, and export actions.
- [ ] Add unit tests before implementation.

## 4. Backend Actions and Queries

- Create: `features/accounting/queries.ts`
- Create: `features/accounting/actions.ts`

Tasks:

- [ ] Query chart of accounts, periods, journal entries/lines, tax records, bank records, and exports.
- [ ] Create GL accounts, manual journal entries, tax rates/reports, bank transactions, reconciliations, and exports.
- [ ] Post journal entries through a server action.
- [ ] Enforce server-side permissions.
- [ ] Audit sensitive accounting mutations.
- [ ] Revalidate `/finance/accounting`.

## 5. UI

- Create: `app/(app)/finance/accounting/page.tsx`
- Create: `app/(app)/finance/accounting/accounting-action-forms.tsx`
- Update navigation and permissions constants if needed.

Tasks:

- [ ] Build Accounting dashboard page.
- [ ] Add create forms with client-enhanced success/error feedback.
- [ ] Add posted/draft status badges.
- [ ] Add links from Finance Lite page to Accounting.
- [ ] Keep layout responsive and professional.

## 6. E2E and Docs

- Update: `tests/e2e/auth-workspace.spec.ts`
- Create: `docs/phase-17-full-accounting.md`
- Update: `README.md`

Tasks:

- [ ] Extend protected route checks for `/finance/accounting`.
- [ ] Extend main workflow to create/post accounting records.
- [ ] Document permissions, schema, and launch limitations.

## 7. Verification and Commit

Run:

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `npx supabase db reset`
- [ ] `npx supabase test db`
- [ ] `npm run test:e2e`

Commit implementation with `feat: add full accounting phase`.
