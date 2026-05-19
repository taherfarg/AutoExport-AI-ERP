# Phase 5 Import/Export Operations

Phase 5 adds import/export operations for AutoSphere ERP.

## Implemented

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
- Server actions with Zod validation.
- Audit logs for export/import order mutations and operational updates.
- Unit, pgTAP, build, and E2E coverage.

## Security Notes

- All Phase 5 tenant-owned tables include `company_id`.
- Branch-scoped records use composite foreign keys to prevent cross-company branch/order links.
- RLS policies enforce `view_exports`, `manage_exports`, `update_export_status`, and `manage_logistics_partners`.
- Shipping, customs, document, and cost mutations run through authenticated server actions and are still protected by RLS.
- Sensitive operational mutations write `audit_logs` through the server-only service role client.
- Missing export document alerts are surfaced in the order UI now and are ready to feed the Phase 10 alert engine.

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
