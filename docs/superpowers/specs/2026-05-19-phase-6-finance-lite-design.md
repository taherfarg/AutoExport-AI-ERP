# Phase 6 Finance Lite Design

## Scope

Phase 6 builds Finance Lite for car trading, not full accounting. It connects vehicle costing, sales invoices, payments, shipment costs, branch performance, and salesperson commission into finance records that accountants and managers can use without introducing a general ledger.

## Production Outcomes

- Finance dashboard with sales value, paid amount, receivables, payables, expenses, profit, and branch performance.
- Vehicle profit snapshots that preserve profit at a point in time.
- Expenses linked to vehicle, branch, supplier, or export/import order.
- Receivables generated from unpaid invoice balances and manually manageable.
- Payables for supplier/logistics/vendor obligations.
- Salesperson commissions linked to invoices, vehicles, and salespeople.
- Permission-aware finance access using `view_finance` plus new manage permissions.

## Database Design

New public tables:

- `payment_methods`: company payment method catalog.
- `bank_accounts`: company bank account references.
- `cash_accounts`: branch cash drawers or petty cash accounts.
- `expenses`: car-trading expenses by vehicle, branch, export/import order, and category.
- `receivables`: customer balances linked to invoices/vehicles.
- `payables`: supplier/vendor obligations linked to vehicles or logistics.
- `vehicle_profit_snapshots`: preserved vehicle profit figures.
- `branch_profit_snapshots`: branch rollups by period.
- `salesperson_commissions`: commission records linked to invoices/payments.

All tenant tables include `company_id`, branch-scoped records include `branch_id`, and composite foreign keys protect cross-tenant links.

## RLS And Permissions

Existing `view_finance` allows read access. Phase 6 adds:

- `manage_finance`: create/update expenses, receivables, payables, accounts, and snapshots.
- `manage_commissions`: create/update commission records.

RLS must enforce company membership, branch access, and finance permissions. Finance tables are not readable through vehicle or sales permissions alone.

## Business Logic

- Vehicle net profit equals selling price minus landed cost, finance expenses, shipment costs, and commission.
- Receivables expose balance due from sales invoices and support manual status updates.
- Payables track supplier/vendor payment lifecycle.
- Commission defaults to a percent of invoice total, but can be manually overridden.
- Snapshots preserve calculated profit values even if future expenses change.

## UI

Route: `/finance`

Sections:

- KPI cards for sales, paid, receivables, payables, expenses, profit, and commissions.
- Vehicle profit table.
- Receivables and payables tables.
- Expense entry form.
- Commission entry form.
- Branch profit summary.

The UI should stay operational and dense: no marketing page, no decorative hero.

## Tests

- pgTAP proves RLS isolation and finance rollup behavior.
- Vitest covers profit, receivable/payable, and commission calculations.
- Playwright extends the existing workspace flow to create an expense and commission and see finance KPIs update.

## Non-Goals

- No double-entry accounting.
- No tax filing.
- No bank reconciliation.
- No Stripe or payment gateway integration.
- No PDF finance exports until the reports phase.
