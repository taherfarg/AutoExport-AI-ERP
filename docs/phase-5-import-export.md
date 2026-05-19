# Phase 5 Import/Export Operations

Phase 5 adds import/export operations for AutoSphere ERP.

## Planned

- Destination countries.
- Logistics partners.
- Export orders.
- Import orders.
- Shipping events and tracking.
- Customs clearance.
- Export document checklist/status.
- Shipment costs.
- Export dashboard and order detail workflow.
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

