# Phase 2A Vehicle Inventory Core

Phase 2A adds the first production operational module for AutoSphere ERP.

## Implemented

- Vehicle inventory schema.
- Vehicle cost, photo metadata, document metadata, status history, branch movement, and price history tables.
- Tenant and branch RLS policies for all Phase 2A tables.
- Explicit authenticated grants for Supabase Data API compatibility.
- GCC/global seed companies, branches, and 20 realistic vehicles.
- Vehicle pricing calculation utility.
- Vehicle validation schemas.
- Server actions for create, status update, branch movement, and archive.
- Inventory list with KPIs, filters, search, status badges, and add vehicle form.
- Vehicle detail page with specifications, cost breakdown, readiness cards, status timeline, and branch movement records.
- Dashboard inventory KPIs.
- SQL and unit tests.

## Security Notes

- RLS is enabled on every Phase 2A public table.
- Vehicle reads require `view_vehicles`.
- Cost rows require `view_vehicle_cost`.
- Profit and price history require `view_vehicle_profit`.
- Mutations require the relevant vehicle permissions.
- Branch-scoped reads also use branch access checks.
- VIN and stock number are unique per company, not globally.

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

