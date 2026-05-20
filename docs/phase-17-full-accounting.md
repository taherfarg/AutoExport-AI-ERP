# Phase 17: Full Accounting Layer

Phase 17 adds dealership-grade accounting foundations on top of Finance Lite.

## Implemented

- Company-scoped chart of accounts with default dealership accounts.
- Automatic chart seeding for existing and newly-created companies.
- Manual journal entries and journal entry lines.
- Database-enforced balanced journal posting.
- Tax/VAT rates and tax report snapshots.
- Bank transaction records.
- Bank reconciliation records.
- Accounting export queue for CSV, QuickBooks, Xero, Zoho, and DATEV-ready workflows.
- Accounting permissions: `view_accounting`, `manage_accounting`, and `export_accounting`.
- RLS policies for all accounting tables.
- Accounting dashboard at `/finance/accounting`.

## Security

- Accounting tables are tenant-isolated by `company_id`.
- Branch-scoped records use branch access checks.
- Server actions enforce accounting permissions before mutation.
- Sensitive accounting actions create audit logs.
- Posting validation is enforced by a private database trigger.

## Current Limits

- Journal automation from sales, payments, expenses, and inventory is not fully automatic yet.
- External accounting exports store metadata only for now.
- Tax report filing remains manual.
