# Phase 4 Sales Transactions

Phase 4 adds the production sales transaction core for AutoSphere ERP.

## Implemented

- Quotations and quotation line items.
- Reservations and deposit tracking.
- Proforma invoices.
- Sales invoices.
- Payments and balance tracking.
- Permission-aware RLS.
- Sales desk, document preview, invoice monitoring, and workflow actions.

## Security Notes

- Every Phase 4 public sales table has RLS enabled.
- Sales document reads require `view_sales` or payment-specific permissions.
- Reservation creation requires `reserve_vehicle` and updates vehicle status through a database trigger.
- Invoice creation requires `create_invoice`.
- Payment recording requires `record_payment` and refreshes invoice balances through a database trigger.
- Explicit authenticated grants are included for Supabase Data API compatibility.

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
