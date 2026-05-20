# Phase 18: Service / Workshop

Phase 18 adds dealership service department workflows to AutoSphere ERP.

## Implemented

- Service Workshop module at `/service/workshop`.
- Technicians with branch, specialization, hourly rate, and status.
- Service appointments.
- Service orders linked to vehicles and customers.
- Service job cards with technician assignment.
- Labor lines with automatic amount calculation and service order total refresh.
- Inspection checklists and inspection results.
- Warranty claims with claim, approved, paid, and balance tracking.
- Service permissions: `view_service`, `manage_service`, `assign_service_jobs`, and `manage_warranty_claims`.
- RLS policies and pgTAP tests for all service tables.

## Security

- All service tables are scoped by `company_id`.
- Branch-scoped records use branch access checks.
- Server actions validate input with Zod and enforce service permissions.
- Mutations create audit logs.

## Current Limits

- Parts usage is not connected yet; that is Phase 19.
- OEM warranty API integration is provider-ready only.
- Bay scheduling and technician mobile workflows are future enhancements.
