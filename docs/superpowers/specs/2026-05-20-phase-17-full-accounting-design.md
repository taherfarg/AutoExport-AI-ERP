# Phase 17: Full Accounting Layer Design

Phase 17 upgrades AutoSphere ERP from Finance Lite into a dealership-grade accounting backbone while preserving the car-trading finance workflows already built in Phase 6.

## Goals

- Add a company-scoped chart of accounts.
- Add manual journal entries and journal lines.
- Enforce balanced posting at the database layer.
- Add accounting periods for future close/lock workflows.
- Add tax/VAT rates and tax report snapshots.
- Add bank transaction and reconciliation records.
- Add accounting export records for CSV and external accounting systems.
- Keep all accounting data tenant-isolated by Supabase RLS.
- Expose a practical UI under `/finance/accounting`.

## Non-Goals

- Full automated double-entry generation from every legacy workflow.
- Real QuickBooks, Xero, Zoho, or DATEV API dispatch.
- Payroll accounting.
- Legal filing submission.

## Data Model

New accounting tables:

- `gl_accounts`
- `accounting_periods`
- `journal_entries`
- `journal_entry_lines`
- `tax_rates`
- `tax_reports`
- `bank_transactions`
- `bank_reconciliations`
- `accounting_exports`

Every table includes `company_id`, audit columns, timestamps, and soft delete where appropriate. Branch-scoped tables include `branch_id`.

Default chart of accounts is seeded for every existing and newly-created company:

- Cash and bank assets
- Accounts receivable
- Vehicle inventory
- Accounts payable
- VAT payable
- Equity
- Vehicle sales revenue
- Cost of vehicles sold
- Vehicle operating expenses
- Bank fees
- Sales commissions

## Permissions

New permissions:

- `view_accounting`
- `manage_accounting`
- `export_accounting`

Accounting reads require `view_accounting`, `manage_accounting`, `export_accounting`, or existing `view_finance`. Mutations require `manage_accounting`. Export records require `export_accounting` or `manage_accounting`.

## Posting Rules

Journal entries start as `draft`.

Posting requires:

- At least one debit and one credit line.
- Total debits equal total credits after two-decimal rounding.
- Total debit is greater than zero.

The rule is enforced by a private database trigger before status changes to `posted`.

## UI

Route: `/finance/accounting`

Sections:

- Accounting KPI cards
- Chart of accounts
- Manual journal form
- Journal entry table with post action
- Tax rates and tax reports
- Bank transactions and reconciliations
- Accounting exports

The page follows the existing production dashboard style used by Finance Lite, Marketplace Sync, Billing, and Deal Desk.

## Testing

- Unit tests cover journal balance, trial balance summaries, tax calculation, and bank reconciliation differences.
- pgTAP tests prove RLS, permissions, tenant isolation, default chart seeding, and balanced journal posting enforcement.
- Playwright extends the main workflow to create/post a journal, create tax/bank/reconciliation/export records, and verify visible feedback.

## Security Notes

- RLS is enabled on every public accounting table.
- Branch-aware reads use the existing branch access helper.
- Private trigger functions stay in `app_private`.
- Accounting exports record metadata only; provider integrations and actual files are future work.
