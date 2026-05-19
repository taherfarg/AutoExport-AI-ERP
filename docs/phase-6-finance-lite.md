# Phase 6 Finance Lite

Phase 6 adds car-trading finance workflows for AutoSphere ERP.

## Implemented

- Expenses.
- Receivables.
- Payables.
- Payment methods.
- Bank and cash accounts.
- Vehicle profit snapshots.
- Branch profit snapshots.
- Salesperson commissions.
- Finance dashboard.
- Permission-aware RLS.
- Server-side finance permission checks.
- Audit logs for finance mutations.
- Unit, pgTAP, build, and E2E coverage.

## Security Notes

- Finance reads require `view_finance`.
- Finance mutations require `manage_finance`.
- Commission mutations require `manage_commissions`.
- Sales invoice receivables sync through a private database trigger so sales users can create invoices without direct finance mutation rights.
- Finance server actions validate payloads with Zod and perform explicit permission checks before service-role writes.
- Finance tables are tenant-scoped by `company_id`; branch-scoped records include `branch_id`.

## Verification

Run:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```
