# Phase 4 Sales Transactions

Phase 4 adds the production sales transaction core for AutoSphere ERP.

## Planned

- Quotations and quotation line items.
- Reservations and deposit tracking.
- Proforma invoices.
- Sales invoices.
- Payments and balance tracking.
- Permission-aware RLS.
- Sales desk, document preview, invoice monitoring, and workflow actions.

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

