# Phase 6 Finance Lite

Phase 6 adds car-trading finance workflows for AutoSphere ERP.

## Planned

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
